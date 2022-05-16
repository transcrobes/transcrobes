# -*- coding: utf-8 -*-
from __future__ import annotations

import base64
import datetime
import gc
import json  # import orjson as json
import logging
import os
import pathlib
import shutil
from tempfile import mkdtemp
from typing import List

from app.core.config import settings
from app.db.session import async_session
from app.enrich import latest_character_json_dir_path
from app.enrich.data import managers
from app.enrich.models import definition
from app.models.migrated import CachedDefinition
from app.models.user import AuthUser
from github import Github
from sqlalchemy.ext.asyncio.session import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.sql.expression import distinct

logger = logging.getLogger(__name__)


async def all_cached_definitions(db: AsyncSession, from_lang: str, to_lang: str) -> List[CachedDefinition]:
    result = await db.execute(
        select(CachedDefinition).filter_by(from_lang=from_lang, to_lang=to_lang).order_by("cached_date", "word_id")
    )
    return result.scalars().all()


async def refresh_cached_definitions(
    db: AsyncSession,
    response_json_match_string: str,
    print_progress: bool = True,
    from_lang: str = "zh-Hans",
    to_lang: str = "en",
) -> bool:
    manager = managers.get(f"{from_lang}:{to_lang}")  # FIXME: hardcoding!!!

    alldems: List[CachedDefinition] = await all_cached_definitions(db, from_lang, to_lang)

    for i, d in enumerate(alldems):
        if print_progress and i % 1000 == 0:
            logger.info(datetime.datetime.now(), d.id)
        if response_json_match_string not in d.response_json:
            continue
        await definition(db, manager, {"l": d.source_text, "pos": "NN"}, refresh=True)
    return True


def chunks(alist, n):
    """Yield successive n-sized chunks from the parameter list alist."""
    for i in range(0, len(alist), n):
        yield alist[i : i + n]  # noqa: E203


async def regenerate_definitions_jsons_multi(  # pylint: disable=R0914
    fakelimit: int = 0, from_lang: str = "zh-Hans", to_lang: str = "en"
) -> bool:
    # FIXME: the DefinitionSet DEFINITELY shouldn't be in the graphql module...
    from app.api.api_v1.graphql import DefinitionSet  # pylint: disable=C0415

    # save a new file for each combination of providers
    logger.info("Generating definitions jsons")

    pathlib.Path(settings.DEFINITIONS_CACHE_DIR).mkdir(parents=True, exist_ok=True)
    async with async_session() as db:
        result = await db.execute(select(distinct(AuthUser.dictionary_ordering)))

        for tc in result.scalars().all():
            # WARNING Do NOT delete - we set these values to None and gc.collect, or memory use will explode
            file_cached_definitions = None
            export = None
            gc.collect()

            providers = tc.split(",")
            stmt = (
                select(CachedDefinition)
                .filter_by(from_lang=from_lang, to_lang=to_lang)
                .order_by("cached_date", "word_id")
            )
            result = await db.execute(stmt.limit(fakelimit)) if fakelimit > 0 else await db.execute(stmt)

            file_cached_definitions = result.scalars().all()
            export = [DefinitionSet.from_model_asdict(ds, providers) for ds in file_cached_definitions]
            if len(export) == 0:  # don't create empty files
                continue
            logger.info("Loaded all definitions for %s, flushing to files", providers)

            last_new_definition = export[-1]
            ua = last_new_definition["updatedAt"]
            wid = last_new_definition["id"]
            provs = "-".join(providers)
            new_files_dir_path = os.path.join(settings.DEFINITIONS_CACHE_DIR, f"definitions-{ua}-{wid}-{provs}_json")
            tmppath = mkdtemp(dir=settings.DEFINITIONS_CACHE_DIR)
            for i, block in enumerate(chunks(export, settings.DEFINITIONS_PER_CACHE_FILE)):
                chunkpath = os.path.join(tmppath, f"{i:03d}.json")
                logger.info("Saving chunk to file %s", chunkpath)
                with open(chunkpath, "w", encoding="utf8") as definitions_file:
                    json.dump(block, definitions_file)

            shutil.rmtree(new_files_dir_path, ignore_errors=True)
            os.rename(tmppath, new_files_dir_path)

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
    return True
