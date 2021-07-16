# -*- coding: utf-8 -*-
from __future__ import annotations

import datetime
import gc
import json  # import orjson as json
import logging
import os
import pathlib
import shutil
from tempfile import mkdtemp
from typing import List

import requests
from app.core.config import settings
from app.db.session import async_session
from app.enrich.data import managers
from app.enrich.models import definition
from app.models.migrated import CachedDefinition
from app.models.user import AuthUser
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


def regenerate_character_jsons_multi() -> bool:
    pathlib.Path(settings.HANZI_CACHE_DIR).mkdir(parents=True, exist_ok=True)

    logger.info(f"Generating character jsons, trying to download if a URL {settings.HANZI_WRITER_DATA_URL=}")

    try:
        strokes = requests.get(settings.HANZI_WRITER_DATA_URL).json()
    except Exception:  # pylint: disable=W0703  # FIXME: do better
        logger.info(f"Looks like it isn't a valid url, trying as a file path {settings.HANZI_WRITER_DATA_URL=}")
        with open(settings.HANZI_WRITER_DATA_URL, encoding="utf8") as fstrokes:
            strokes = json.load(fstrokes)

    cur = 0
    entries = []
    logger.info("Saving character chunks to files")
    for i, (k, v) in enumerate(strokes.items()):
        if int(i / settings.HANZI_PER_CACHE_FILE) != cur:
            chunkpath = os.path.join(settings.HANZI_CACHE_DIR, f"hanzi-{cur:03d}.json")
            logger.info("Saving chunk to file %s", chunkpath)
            with open(chunkpath, "w", encoding="utf8") as chunk:
                json.dump(entries, chunk)
            cur = int(i / settings.HANZI_PER_CACHE_FILE)
            entries = []
        entries.append(
            {
                "id": k,
                "structure": v,
            }
        )
    with open(os.path.join(settings.HANZI_CACHE_DIR, f"hanzi-{cur:03d}.json"), "w", encoding="utf8") as hzf:
        json.dump(entries, hzf)
    return True
