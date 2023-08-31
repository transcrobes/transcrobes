# -*- coding: utf-8 -*-
from __future__ import annotations

import base64
import contextlib
import datetime
import gc
import json  # import orjson as json
import logging
import os
import pathlib
import shutil
import sqlite3
import tempfile
from typing import List

from app import models
from app.api.api_v1.types import ContentQuestions, FreeQuestions, Questions, Userdictionaries
from app.cache import add_word_ids
from app.core.config import settings
from app.data.filter import filter_cards, filter_day_model_stats, filter_standard, filter_word_model_stats
from app.db.session import async_session
from app.enrich import hanzi_json_local_paths, lang_prefix, latest_character_json_dir_path
from app.enrich.data import managers
from app.enrich.models import definitions, ensure_cache_preloaded
from app.enrich.sqlite_definitions import (
    CARDS_CREATE,
    CARDS_INDEX_WORD_ID_CARD_TYPE_UPDATED_AT,
    CARDS_INSERT,
    CHARACTERS_CREATE,
    CHARACTERS_INSERT,
    CONTENT_QUESTIONS_CREATE,
    CONTENT_QUESTONS_INSERT,
    DAY_MODEL_STATS_CREATE,
    DAY_MODEL_STATS_INSERT,
    DEFINITIONS_CREATE,
    DEFINITIONS_INDEX_ID_GRAPH,
    DEFINITIONS_INDEX_ID_UPDATED_AT,
    DEFINITIONS_INSERT,
    FREE_QUESTIONS_CREATE,
    FREE_QUESTONS_INSERT,
    IMPORT_WORDS_CREATE,
    IMPORT_WORDS_INDEX_ID,
    IMPORT_WORDS_INSERT,
    IMPORTS_CREATE,
    IMPORTS_INSERT,
    KNOWN_WORDS_VIEW_CREATE,
    LIST_WORDS_CREATE,
    LIST_WORDS_INSERT,
    QUESTIONS_CREATE,
    QUESTONS_INSERT,
    USER_DEFINITIONS_CREATE,
    USER_DEFINITIONS_INSERT,
    USERDICTIONARIES_CREATE,
    USERDICTIONARIES_INSERT,
    WORD_MODEL_STATS_CREATE,
    WORD_MODEL_STATS_INSERT,
    WORDLISTS_CREATE,
    WORDLISTS_INSERT,
)
from app.etypes import LANG_PAIR_SEPARATOR
from app.models.lookups import BingApiLookup
from app.models.mixins import ActivatorMixin
from app.models.user import AuthUser, absolute_resources_path
from app.ndutils import get_from_lang, get_to_lang
from github import Github
from sqlalchemy.ext.asyncio.session import AsyncSession
from sqlalchemy.sql.expression import and_, distinct, or_, select

from .lzstring import LZString

logger = logging.getLogger(__name__)

FLUSH_BUFFER_SIZE = 30000
SQLITE_FILENAME = "tc.db"
SQLITE_FILENAME_SQL = "tc.sql"


async def all_cached_definitions(db: AsyncSession, from_lang: str, to_lang: str) -> List[models.CachedDefinition]:
    result = await db.execute(
        select(models.CachedDefinition)
        .filter_by(from_lang=from_lang, to_lang=to_lang)
        .order_by("cached_date", "word_id")
    )
    return result.scalars().all()


async def ensure_cached_definitions(
    db: AsyncSession,
    print_progress: bool = True,
    from_lang: str = "",
    to_lang: str = "",
) -> bool:
    mans = []
    if from_lang and to_lang:
        man = managers.get(f"{from_lang}:{to_lang}")
        if not man:
            raise Exception("No manager found for this language pair")
        mans.append(man)
    else:
        mans = managers.values()

    for manager in mans:
        result = await db.execute(
            select(BingApiLookup)
            .filter_by(from_lang=manager.from_lang, to_lang=manager.to_lang)
            .order_by("cached_date", "id")
        )

        defs_to_cache = result.scalars().all()

        for i, d in enumerate(defs_to_cache):
            w = d.source_text
            t = {"word": w, "pos": "NN", "lemma": w}  # fake pos, here we don't care
            if print_progress and i % 1000 == 0:
                logger.info(f"{manager.to_lang=}, {manager.from_lang=}, {w=}, {i=}")
            if not manager.enricher().needs_enriching(t) or manager.enricher().clean_text(w) != w:
                logger.info(f"Not caching unclean word: {manager.to_lang}, {manager.from_lang}, {w=}, {i=}")
                continue
            if not d.response_json:
                raise Exception(f"Empty response_json: {manager.to_lang}, {manager.from_lang}, {w=}, {i=}")

            obj = json.loads(d.response_json)[0]
            if obj.get("translations") == []:
                logger.warning(
                    f"response_json does not have any defs, ignoring for now: {manager.to_lang}, {manager.from_lang},"
                    f" {w=}, {i=}"
                )
                continue
            await definitions(db, manager, {"l": w, "pos": "NN"})

    return True


async def refresh_cached_definitions(
    db: AsyncSession,
    response_json_match_string: str,
    print_progress: bool = True,
    from_lang: str = "zh-Hans",
    to_lang: str = "en",
) -> bool:
    manager = managers.get(f"{from_lang}:{to_lang}")  # FIXME: hardcoding!!!

    alldems: List[models.CachedDefinition] = await all_cached_definitions(db, from_lang, to_lang)

    for i, d in enumerate(alldems):
        if print_progress and i % 1000 == 0:
            logger.info(datetime.datetime.now(), d.id)
        if response_json_match_string not in d.response_json:
            continue
        await definitions(db, manager, {"l": d.source_text, "pos": "NN"}, refresh=True)
    return True


def chunks(alist, n):
    """Yield successive n-sized chunks from the parameter list alist."""
    for i in range(0, len(alist), n):
        yield alist[i : i + n]  # noqa: E203


def flatten(matrix):
    flat_list = []
    for row in matrix:
        flat_list += row
    return flat_list


async def fill_sqlite_userlists(db: AsyncSession, con, user_id: int, from_lang: str) -> bool:
    stmt = (
        select(models.UserListWord, models.UserList)
        .join(models.UserList)
        .where(models.UserList.deleted.is_not(True))
        .where(
            or_(
                and_(
                    models.UserList.created_by_id == user_id,
                    models.AuthUser.id == user_id,
                    models.UserList.status == ActivatorMixin.ACTIVE_STATUS,
                ),
                and_(
                    models.UserList.from_lang == from_lang,
                    models.UserList.status == ActivatorMixin.ACTIVE_STATUS,
                    models.UserList.shared.is_(True),
                    models.AuthUser.is_superuser.is_(True),
                    models.UserList.created_by_id == models.AuthUser.id,
                ),  # pylint: disable=W0143
            )
        )
    )
    result = await db.execute(stmt)
    buffer = []
    i = 0
    all_user_lists = {}

    for v in result:
        if v[1].id not in all_user_lists:
            all_user_lists[v[1].id] = v[1]
        buffer.append(
            (
                str(v[0].user_list_id),
                int(v[0].word_id),
                int(v[0].default_order),
            )
        )
        if i >= FLUSH_BUFFER_SIZE:
            con.executemany(LIST_WORDS_INSERT, buffer)
            buffer = []
            i = 0
        i += 1
    if len(buffer) > 0:
        con.executemany(LIST_WORDS_INSERT, buffer)
        buffer = []

    for v in all_user_lists.values():
        buffer.append(
            (
                str(v.id),
                str(v.title),
                v.is_default,
                v.updated_at.timestamp(),
            )
        )
    con.executemany(WORDLISTS_INSERT, buffer)


async def fill_sqlite_imports(db: AsyncSession, con: sqlite3.Connection, user_id: int, lang_pair: str) -> bool:
    from_lang = get_from_lang(lang_pair)
    to_lang = get_to_lang(lang_pair)

    buffer = []
    stmt = select(models.Import).where(and_(models.Import.created_by_id == user_id))
    result = await db.execute(stmt)
    i = 0
    import_sentences = []
    for v in result:
        if v[0].analysis:
            analysis = json.loads(v[0].analysis)
            if "sentenceLengths" in analysis:
                import_sentences.append(
                    [str(v[0].id), json.dumps(analysis["sentenceLengths"]), v[0].updated_at.timestamp()]
                )
            for nb_occurrences, words in analysis["vocabulary"]["buckets"].items():
                # graph, import_id, nb_occurrences, word_id
                for word in words:
                    buffer.append(
                        [
                            word,
                            str(v[0].id),
                            int(nb_occurrences),
                        ]
                    )
    await ensure_cache_preloaded(db, from_lang, to_lang)
    with_ids = add_word_ids(buffer, lang_pair, allow_missing=True)
    buffer = []
    for v in with_ids:
        if v[3] is None:
            logger.error(f"Could not find word_id for {v[0]}")
            continue
        buffer.append(v)
        if i >= FLUSH_BUFFER_SIZE:
            con.executemany(IMPORT_WORDS_INSERT, buffer)
            buffer = []
            i = 0
        i += 1
    if len(buffer) > 0:
        con.executemany(IMPORT_WORDS_INSERT, buffer)
        buffer = []

    con.executemany(IMPORTS_INSERT, import_sentences)


async def fill_sqlite_stats(con: sqlite3.Connection, user_id: int, lang_pair: str) -> bool:
    buffer = []
    wstats = []
    for w in await filter_word_model_stats(user_id, lang_pair, -1):
        wstats.append(
            (
                int(w.id),
                w.nb_seen,
                w.nb_seen_since_last_check,
                w.last_seen,
                w.nb_checked,
                w.last_checked,
                0,
                0,
                w.updated_at,
            )
        )

    i = 0
    for v in wstats:
        buffer.append(v)
        if i >= FLUSH_BUFFER_SIZE:
            con.executemany(WORD_MODEL_STATS_INSERT, buffer)
            buffer = []
            i = 0
        i += 1
    if len(buffer) > 0:
        con.executemany(WORD_MODEL_STATS_INSERT, buffer)
        buffer = []

    day_model_stats = await filter_day_model_stats(user_id, 10000000)  # unlimited
    i = 0
    for v in day_model_stats:
        buffer.append(
            (
                str(v.id),
                v.nb_seen,
                v.nb_checked,
                v.nb_success,
                v.nb_failures,
                v.updated_at,
            )
        )
        if i >= FLUSH_BUFFER_SIZE:
            con.executemany(DAY_MODEL_STATS_INSERT, buffer)
            buffer = []
            i = 0
        i += 1
    if len(buffer) > 0:
        con.executemany(DAY_MODEL_STATS_INSERT, buffer)
        buffer = []


# async def fill_sqlite_surveys(db: AsyncSession, con: sqlite3.Connection, lang_pair: str) -> bool:
#     from_lang = get_from_lang(lang_pair)
#     to_lang = get_to_lang(lang_pair)
#
#     buffer = []
#     surveys = await filter_surveys(db, from_lang, to_lang, 10000000)  # unlimited
#     i = 0
#     for v in surveys:
#         buffer.append(
#             (
#                 str(v.id),
#                 json.dumps(v.survey_json),
#                 v.is_obligatory,
#                 v.updated_at,
#             )
#         )
#         if i >= FLUSH_BUFFER_SIZE:
#             con.executemany(SURVEYS_INSERT, buffer)
#             buffer = []
#             i = 0
#         i += 1
#     if len(buffer) > 0:
#         con.executemany(SURVEYS_INSERT, buffer)


def cards_to_sqlite3(cards):
    cards_buffer = []
    for v in cards:
        word_id = int((v.id).split("-")[0])  # word_id
        cards_buffer.append(
            (
                word_id,
                int(str(v.id).split("-")[1]),  # card_type
                v.due_date,
                v.first_revision_date,
                v.last_revision_date,
                v.first_success_date,
                v.suspended,
                v.known,
                v.updated_at,
            )
        )
    return cards_buffer


async def fill_sqlite_content_questions(db: AsyncSession, con: sqlite3.Connection, user_id: int) -> bool:
    buffer = []
    content_questions = (
        await filter_standard(
            db,
            user_id,
            100000,
            ContentQuestions,
            models.ContentQuestion,
        )
    ).documents
    for cq in content_questions:
        buffer.append(
            (
                str(cq.id),
                cq.content_id,
                cq.model_ids,
                cq.href,
                cq.updated_at,
            )
        )
    if len(buffer) > 0:
        con.executemany(CONTENT_QUESTONS_INSERT, buffer)


async def fill_sqlite_questions(db: AsyncSession, con: sqlite3.Connection, user_id: int) -> bool:
    buffer = []
    free_questions = (
        await filter_standard(
            db,
            user_id,
            100000,
            Questions,
            models.Question,
        )
    ).documents
    for cq in free_questions:
        buffer.append(
            (
                str(cq.id),
                cq.question,
                cq.question_type,
                cq.extra_data,
                cq.shared,
                cq.updated_at,
            )
        )
    if len(buffer) > 0:
        con.executemany(QUESTONS_INSERT, buffer)


async def fill_sqlite_free_questions(db: AsyncSession, con: sqlite3.Connection, user_id: int) -> bool:
    buffer = []
    free_questions = (
        await filter_standard(
            db,
            user_id,
            100000,
            FreeQuestions,
            models.FreeQuestion,
        )
    ).documents
    for cq in free_questions:
        buffer.append(
            (
                str(cq.id),
                cq.context,
                cq.updated_at,
            )
        )
    if len(buffer) > 0:
        con.executemany(FREE_QUESTONS_INSERT, buffer)


async def fill_sqlite_cards(db: AsyncSession, con: sqlite3.Connection, user_id: int) -> bool:
    cards = await filter_cards(db, user_id, 1000000)
    cards_buffer = cards_to_sqlite3(cards)
    con.executemany(CARDS_INSERT, cards_buffer)
    con.execute(CARDS_INDEX_WORD_ID_CARD_TYPE_UPDATED_AT)


async def fill_sqlite_userdictionaries(db: AsyncSession, user_id: int, con: sqlite3.Connection) -> bool:
    buffer = []
    userdictionaries = (
        await filter_standard(
            db,
            user_id,
            100000,
            Userdictionaries,
            models.UserDictionary,
        )
    ).documents
    i = 0
    x = LZString()
    udvals = []
    for ud in userdictionaries:
        if ud.lz_content is None:
            logger.warning(f"{ud.id} has no lz_content")
            continue

        udvals.append(
            (
                str(ud.id),
                ud.updated_at,
            )
        )

        decomp = x.decompressFromUTF16(ud.lz_content)
        if decomp is None:
            logger.warning(f"{ud.id} has no decompressed lz_content")
            continue
        dico = json.loads(decomp)
        for k, v in dico.items():
            # lz-string produces surrogates...
            clean = k.encode("utf-16", "surrogatepass").decode("utf-16")
            buffer.append(
                (
                    clean,
                    str(ud.id),
                    json.dumps(v["translations"]),
                    json.dumps(v["sounds"]) if v.get("sounds") else None,
                )
            )
            if i >= FLUSH_BUFFER_SIZE:
                con.executemany(USER_DEFINITIONS_INSERT, buffer)
                buffer = []
                i = 0
            i += 1
    if len(buffer) > 0:
        con.executemany(USER_DEFINITIONS_INSERT, buffer)

    # now fill userdictionaries table
    if len(udvals) > 0:
        con.executemany(USERDICTIONARIES_INSERT, udvals)


async def regenerate_personal_db(base_db_path: str, user_id: int, lang_pair: str) -> str:  # pylint: disable=R0914
    from_lang = get_from_lang(lang_pair)
    logger.info("Filling sqlite3 db with personal values for %s", user_id)
    async with async_session() as db:
        tmpdirpath = tempfile.mkdtemp()
        tmpsqldb = os.path.join(tmpdirpath, SQLITE_FILENAME)
        shutil.copyfile(base_db_path, tmpsqldb)
        con = sqlite3.connect(tmpsqldb)

        await fill_sqlite_userdictionaries(db, user_id, con)
        await fill_sqlite_userlists(db, con, user_id, from_lang)
        await fill_sqlite_imports(db, con, user_id, lang_pair)
        await fill_sqlite_stats(con, user_id, lang_pair)
        # await fill_sqlite_surveys(db, con, lang_pair)
        await fill_sqlite_cards(db, con, user_id)
        await fill_sqlite_content_questions(db, con, user_id)
        await fill_sqlite_free_questions(db, con, user_id)
        await fill_sqlite_questions(db, con, user_id)
        # FIXME: missing the student_* tables
        # FIXME: missing the persons table

        con.execute(IMPORT_WORDS_INDEX_ID)
        con.commit()

        destdir = absolute_resources_path(user_id, SQLITE_FILENAME)
        with contextlib.suppress(FileNotFoundError, IsADirectoryError):
            os.remove(destdir)
        shutil.rmtree(destdir, ignore_errors=True)
        pathlib.Path(destdir).mkdir(parents=True, exist_ok=True)

        # tmpsqldb_sql = os.path.join(destdir, SQLITE_FILENAME_SQL)
        # with open(tmpsqldb_sql, "w") as f:
        #     for line in con.iterdump():
        #         f.write("%s\n" % line)

        con.close()
        await db.close()

        CHUNK_SIZE = 10_485_760  # 32768*320 this will get compressed over the wire, so isn't really ~10MB
        file_number = 0
        with open(tmpsqldb, "rb") as f:
            chunk = f.read(CHUNK_SIZE)
            while chunk:
                with open(
                    os.path.join(destdir, f"{SQLITE_FILENAME}.{str(file_number).zfill(4)}.part"), "wb"
                ) as chunk_file:
                    chunk_file.write(chunk)
                file_number += 1
                chunk = f.read(CHUNK_SIZE)
        # shutil.move(tmpsqldb, os.path.join(destdir, SQLITE_FILENAME))
        shutil.rmtree(tmpdirpath, ignore_errors=True)
    return True


def def_dict_to_sqlite3(adef: dict) -> None:
    fallback_only = True
    for pt in adef["providerTranslations"]:
        if pt["provider"] != "fbk" and len(pt["posTranslations"]) > 0:
            fallback_only = False
            break
    return (
        adef["id"],
        adef["graph"],
        json.dumps(adef["sound"]),
        json.dumps(adef["synonyms"]),
        json.dumps(adef["providerTranslations"]),
        float(adef["frequency"]["wcpm"]) if adef["frequency"].get("wcpm", "") != "" else None,
        float(adef["frequency"]["wcdp"]) if adef["frequency"].get("wcdp", "") != "" else None,
        adef["frequency"].get("pos", None),
        adef["frequency"].get("posFreq", None),
        json.dumps(adef["hsk"]) if adef["hsk"] else None,
        fallback_only,
        adef["updatedAt"],
    )


async def fill_sqlite_definitions(
    db: AsyncSession, con: sqlite3.Connection, providers: list[str], from_lang: str, to_lang: str
) -> bool:
    # FIXME: the DefinitionSet DEFINITELY shouldn't be in the graphql module...
    from app.api.api_v1.graphql import Definitions  # pylint: disable=C0415

    # WARNING Do NOT delete - memory will explode otherwise
    gc.collect()

    buffer = []
    stmt = (
        select(models.CachedDefinition)
        .filter_by(from_lang=from_lang, to_lang=to_lang)
        .order_by("cached_date", "word_id")
    )
    result = await db.execute(stmt)
    file_cached_definitions = result.scalars().all()

    export = [Definitions.from_model_asdict(ds, providers) for ds in file_cached_definitions]
    if len(export) == 0:  # don't create empty files
        return
    logger.info("Loaded all definitions for %s, flushing to files", providers)

    last_new_definition = export[-1]
    ua = last_new_definition["updatedAt"]
    wid = last_new_definition["id"]
    provs = "-".join(providers)
    outfile_dir = f"{lang_prefix(f'{from_lang}{LANG_PAIR_SEPARATOR}{to_lang}')}db-{ua}-{wid}-{provs}_sqlite"

    new_files_dir_path = os.path.join(
        settings.DB_CACHE_DIR,
        outfile_dir,
    )

    buffer = []
    i = 0
    for adef in export:
        buffer.append(def_dict_to_sqlite3(adef))
        if i >= FLUSH_BUFFER_SIZE:
            con.executemany(DEFINITIONS_INSERT, buffer)
            buffer = []
            i = 0
        i += 1
    if len(buffer) > 0:
        con.executemany(DEFINITIONS_INSERT, buffer)

    con.execute(DEFINITIONS_INDEX_ID_GRAPH)
    con.execute(DEFINITIONS_INDEX_ID_UPDATED_AT)

    return new_files_dir_path


async def fill_sqlite_characters(con: sqlite3.Connection) -> bool:
    buffer = []
    last_updated = int(os.path.basename(latest_character_json_dir_path()) or 0)
    i = 0
    for hanzi_json in hanzi_json_local_paths():
        with open(hanzi_json, "r", encoding="utf8") as hzf:
            hanzis = json.load(hzf)
            for hanzi in hanzis:
                # (id, pinyin, decomposition, radical, etymology, structure, updated_at)
                buffer.append(
                    (
                        hanzi["id"],
                        json.dumps(hanzi["pinyin"]),
                        json.dumps(hanzi["decomposition"]),
                        json.dumps(hanzi["radical"]),
                        json.dumps(hanzi["etymology"]) if hanzi.get("etymology") else None,
                        json.dumps(hanzi["structure"]) if hanzi.get("structure") else None,
                        last_updated,
                    )
                )
                if i >= FLUSH_BUFFER_SIZE:
                    con.executemany(CHARACTERS_INSERT, buffer)
                    buffer = []
                    i = 0
                i += 1
    if len(buffer) > 0:
        con.executemany(CHARACTERS_INSERT, buffer)


async def regenerate_sqlite(from_lang: str = "zh-Hans", to_lang: str = "en") -> bool:  # pylint: disable=R0914
    # save a new file for each combination of providers
    logger.info("Generating definitions and characters sqlite3 db")

    pathlib.Path(settings.DB_CACHE_DIR).mkdir(parents=True, exist_ok=True)
    async with async_session() as db:
        result = await db.execute(select(distinct(AuthUser.dictionary_ordering)))

        for tc in result.scalars().all():
            providers = tc.split(",")
            tmppath = tempfile.mkdtemp(dir=settings.DB_CACHE_DIR)
            tmpsqldb = os.path.join(tmppath, SQLITE_FILENAME)
            con = sqlite3.connect(tmpsqldb)
            con.execute("PRAGMA page_size=32768;")
            con.execute("VACUUM;")
            con.commit()
            con.execute(DEFINITIONS_CREATE)
            new_files_dir_path = await fill_sqlite_definitions(db, con, providers, from_lang, to_lang)

            con.execute(CHARACTERS_CREATE)
            if (from_lang, to_lang) == ("zh-Hans", "en"):
                await fill_sqlite_characters(con)

            con.execute(USER_DEFINITIONS_CREATE)
            con.execute(USERDICTIONARIES_CREATE)
            con.execute(WORD_MODEL_STATS_CREATE)
            con.execute(DAY_MODEL_STATS_CREATE)
            con.execute(LIST_WORDS_CREATE)
            con.execute(WORDLISTS_CREATE)
            con.execute(IMPORT_WORDS_CREATE)
            con.execute(IMPORTS_CREATE)
            con.execute(CARDS_CREATE)
            con.execute(CONTENT_QUESTIONS_CREATE)
            con.execute(FREE_QUESTIONS_CREATE)
            con.execute(QUESTIONS_CREATE)

            # con.execute(PERSONS_CREATE)
            # con.execute(STUDENT_WORD_MODEL_STATS_CREATE)
            # con.execute(STUDENT_DAY_MODEL_STATS_CREATE)
            # con.execute(SURVEYS_CREATE)

            con.execute(IMPORT_WORDS_INDEX_ID)
            con.execute(KNOWN_WORDS_VIEW_CREATE)

            con.commit()
            con.close()
            shutil.rmtree(new_files_dir_path, ignore_errors=True)
            shutil.move(tmppath, new_files_dir_path)

            logger.info(
                "Flushed all definitions for %s to file %s",
                from_lang,
                providers,
            )
        await db.close()
    return True


async def regenerate_definitions_jsons_multi(  # pylint: disable=R0914
    fakelimit: int = 0, from_lang: str = "zh-Hans", to_lang: str = "en"
) -> bool:
    # FIXME: the DefinitionSet DEFINITELY shouldn't be in the graphql module...
    from app.api.api_v1.graphql import Definitions  # pylint: disable=C0415

    # save a new file for each combination of providers
    logger.info("Generating definitions jsons")

    pathlib.Path(settings.DEFINITIONS_CACHE_DIR).mkdir(parents=True, exist_ok=True)
    async with async_session() as db:
        result = await db.execute(select(distinct(models.AuthUser.dictionary_ordering)))

        for tc in result.scalars().all():
            # WARNING Do NOT delete - we set these values to None and gc.collect, or memory use will explode
            file_cached_definitions = None
            export = None
            gc.collect()

            providers = tc.split(",")
            stmt = (
                select(models.CachedDefinition)
                .filter_by(from_lang=from_lang, to_lang=to_lang)
                .order_by("cached_date", "word_id")
            )
            result = await db.execute(stmt.limit(fakelimit)) if fakelimit > 0 else await db.execute(stmt)

            file_cached_definitions = result.scalars().all()
            export = [Definitions.from_model_asdict(ds, providers) for ds in file_cached_definitions]
            if len(export) == 0:  # don't create empty files
                continue
            logger.info("Loaded all definitions for %s, flushing to files", providers)

            last_new_definition = export[-1]
            ua = last_new_definition["updatedAt"]
            wid = last_new_definition["id"]
            provs = "-".join(providers)
            new_files_dir_path = os.path.join(
                settings.DEFINITIONS_CACHE_DIR,
                f"{lang_prefix(f'{from_lang}{LANG_PAIR_SEPARATOR}{to_lang}')}definitions-{ua}-{wid}-{provs}_json",
            )
            tmppath = tempfile.mkdtemp(dir=settings.DEFINITIONS_CACHE_DIR)
            for i, block in enumerate(chunks(export, settings.DEFINITIONS_PER_CACHE_FILE)):
                chunkpath = os.path.join(tmppath, f"{i:03d}.json")
                logger.info("Saving chunk to file %s", chunkpath)
                with open(chunkpath, "w", encoding="utf8") as definitions_file:
                    json.dump(block, definitions_file)

            shutil.rmtree(new_files_dir_path, ignore_errors=True)
            shutil.move(tmppath, new_files_dir_path)

            logger.info(
                "Flushed all definitions for %s to file %s",
                providers,
                new_files_dir_path,
            )
        await db.close()
    return True


def get_blob_content(repo, path_name, branch="master"):
    # first get the branch reference
    ref = repo.get_git_ref(f"heads/{branch}")
    # then get the tree
    tree = repo.get_git_tree(ref.object.sha, recursive="/" in path_name).tree
    # look for path in tree
    sha = [x.sha for x in tree if x.path == path_name]
    if not sha:
        # well, not found..
        return None
    # we have sha
    return repo.get_git_blob(sha[0])


def regenerate_character_jsons_multi() -> bool:
    logger.info("Generating character jsons")
    pathlib.Path(settings.HANZI_CACHE_DIR).mkdir(parents=True, exist_ok=True)
    last_updated = int(os.path.basename(latest_character_json_dir_path()) or 0)

    g = Github()
    makemeahanzi = g.get_repo(settings.MAKE_ME_A_HANZI_DATA_REPO)
    hanzi_writer = g.get_repo(settings.HANZI_WRITER_DATA_REPO)
    makemeahanzi_commits = makemeahanzi.get_commits(path=settings.MAKE_ME_A_HANZI_DATA_FILE)
    hanzi_writer_commits = hanzi_writer.get_commits(path=settings.HANZI_WRITER_DATA_FILE)
    max_repo_updated = int(
        max(
            makemeahanzi_commits[0].commit.committer.date.timestamp(),
            hanzi_writer_commits[0].commit.committer.date.timestamp(),
        )
    )
    if max_repo_updated <= last_updated:
        return True

    update_directory = os.path.join(settings.HANZI_CACHE_DIR, str(int(max_repo_updated)))
    # FIXME: can actually be exist_ok=False
    pathlib.Path(update_directory).mkdir(parents=True, exist_ok=True)

    hanzi_writer_blob = get_blob_content(hanzi_writer, settings.HANZI_WRITER_DATA_FILE).content
    b64 = base64.b64decode(hanzi_writer_blob)
    hanzi_writer_data = json.loads(b64.decode("utf8"))

    makemeahanzi_blob = get_blob_content(makemeahanzi, settings.MAKE_ME_A_HANZI_DATA_FILE).content
    b64 = base64.b64decode(makemeahanzi_blob)
    makemeahanzi_file = b64.decode("utf8")

    cur = 0
    entries = []
    logger.info("Saving character chunks to files")
    for i, line in enumerate(makemeahanzi_file.splitlines()):
        if int(i / settings.HANZI_PER_CACHE_FILE) != cur:
            chunkpath = os.path.join(update_directory, f"hanzi-{cur:03d}.json")
            logger.info("Saving chunk to file %s", chunkpath)
            with open(chunkpath, "w", encoding="utf8") as chunk:
                json.dump(entries, chunk)
            cur = int(i / settings.HANZI_PER_CACHE_FILE)
            entries = []

        hanzi = json.loads(line)
        entry = {
            "id": hanzi["character"],
            "pinyin": hanzi["pinyin"],
            "radical": hanzi["radical"],
            "decomposition": hanzi["decomposition"],
        }
        if hanzi_writer_data.get(hanzi["character"]):
            entry["structure"] = hanzi_writer_data[hanzi["character"]]
        if hanzi.get("etymology"):
            entry["etymology"] = hanzi["etymology"]

        entries.append(entry)

    with open(os.path.join(update_directory, f"hanzi-{cur:03d}.json"), "w", encoding="utf8") as hzf:
        json.dump(entries, hzf)

    logger.info("Successfully regenerated the charater reference files")
    return True
