# -*- coding: utf-8 -*-
from __future__ import annotations

import datetime
import json  # import orjson as json
import logging
import re
from typing import TYPE_CHECKING

import sqlalchemy
from app.cache import TimestampedDict, cache_loading, cached_definitions  # noqa:F401
from app.data.context import get_broadcast
from app.enrich.etypes import Token
from app.models.migrated import BingApiLookup, CachedDefinition
from app.ndutils import clean_definitions, lemma
from sqlalchemy.ext.asyncio.session import AsyncSession
from sqlalchemy.future import select
from zhon import hanzi

if TYPE_CHECKING:
    from app.enrich.data import EnrichmentManager

logger = logging.getLogger(__name__)
hanzi_chars = re.compile("[{}]".format(hanzi.characters))


async def reload_definitions_cache(db: AsyncSession, from_lang: str, to_lang: str) -> TimestampedDict:
    return await update_cache(db, from_lang, to_lang, 0)


async def ensure_cache_preloaded(db: AsyncSession, from_lang: str, to_lang: str) -> None:
    if not cached_definitions[f"{from_lang}:{to_lang}"]:
        await reload_definitions_cache(db, from_lang, to_lang)


async def update_cache(db: AsyncSession, from_lang: str, to_lang: str, cached_max_timestamp: int) -> TimestampedDict:
    global cache_loading  # pylint: disable=W0603
    if not cached_definitions[f"{from_lang}:{to_lang}"] and cache_loading:
        raise Exception("Cache loading, please come again")

    cache_loading = True  # avoid trashing with a global flag to reduce the number of loads, saving the DB

    if cached_max_timestamp == 0 and cached_definitions[f"{from_lang}:{to_lang}"]:
        logger.error("For some reason trying to reload cache when it is already loaded")
        return

    result = await db.execute(
        select(CachedDefinition)
        .filter(
            CachedDefinition.from_lang == from_lang,
            CachedDefinition.to_lang == to_lang,
            CachedDefinition.cached_date >= datetime.datetime.utcfromtimestamp(cached_max_timestamp),
        )
        .order_by("cached_date")
    )
    definitions = result.scalars().all()
    new_cache = TimestampedDict()
    for cached_entry in definitions:
        new_cache[cached_entry.source_text] = (
            cached_entry.cached_date.timestamp(),
            cached_entry.response_json,
            cached_entry.word_id,
        )

    if cached_definitions[f"{from_lang}:{to_lang}"] and new_cache:
        logger.warning(
            "The new_cache is not empty for ts %s, len %s, new_cache[:100] %s",
            cached_max_timestamp,
            len(new_cache),
            str(new_cache)[:100],
        )
    cached_definitions[f"{from_lang}:{to_lang}"] = cached_definitions[f"{from_lang}:{to_lang}"] | new_cache
    return cached_definitions[f"{from_lang}:{to_lang}"]


async def definition(  # pylint: disable=R0914
    db: AsyncSession, manager: EnrichmentManager, token: Token, refresh: bool = False
):  # noqa:C901  # pylint: disable=R0912
    word = lemma(token)
    if not word:  # calling the api with empty string will put rubbish in the DB
        return None

    val = cached_definitions[f"{manager.from_lang}:{manager.to_lang}"].get(word)
    if val and not refresh:
        return json.loads(val[1])

    try:
        # list(dict) appears to be O(n)
        # cached_max_timestamp = list(cached_definitions[f"{manager.from_lang}:{manager.to_lang}"].values())[-1]["ts"]

        # this next(reversed(dict.values())) appears to be O(1)-ish
        cached_max_timestamp = next(reversed(cached_definitions[f"{manager.from_lang}:{manager.to_lang}"].values()))[0]
    except StopIteration:
        logger.warning("Loading cache from scratch, it is completely empty")
        cached_max_timestamp = 0

    result = await db.execute(
        select(CachedDefinition).filter_by(source_text=word, from_lang=manager.from_lang, to_lang=manager.to_lang)
    )
    cached_entry = result.scalar_one_or_none()

    logger.debug("Found %s element in db for %s", cached_entry, word)
    if not cached_entry or refresh:
        # this will create the ref entry in the DB if not present
        # WARNING! Do NOT move
        default_definition = clean_definitions(await manager.default().get_standardised_defs(db, token))
        fallback_definition = clean_definitions(await manager.default().get_standardised_fallback_defs(db, token))

        result = await db.execute(
            select(BingApiLookup).filter_by(source_text=word, from_lang=manager.from_lang, to_lang=manager.to_lang)
        )
        bing_word = result.scalar_one()

        json_definition = {
            "w": word,
            "id": bing_word.id,
            "defs": {
                manager.default().name(): default_definition,
                manager.default().FALLBACK_SHORT_NAME: fallback_definition,
            },
            "syns": await manager.default().pos_synonyms(db, token),
        }

        sound = await manager.transliterator().transliterate(db, word)
        for x in manager.secondary():
            if not sound or len(hanzi_chars.findall(sound)) != 0:
                sound = await x.sound_for(token)
            json_definition["defs"][x.name()] = clean_definitions(await x.get_standardised_defs(db, token))

        json_definition["p"] = " ".join("?", len(word)) if len(hanzi_chars.findall(sound)) != 0 else sound

        json_definition["metadata"] = {}
        for meta in manager.metadata():
            json_definition["metadata"][meta.name()] = await meta.meta_for_word(db, word)

        definition_object = json.dumps(json_definition, separators=(",", ":"))
        cached_entry = cached_entry or CachedDefinition(
            word=bing_word,
            source_text=word,
            from_lang=manager.from_lang,
            to_lang=manager.to_lang,
        )
        cached_entry.response_json = definition_object
        try:
            logger.debug("Before cached_entry.save for %s", str(cached_entry.id))

            db.add(cached_entry)
            await db.commit()

            logger.debug(
                "After cached_entry.save, before publish broadcast definitions for  %s",
                str(cached_entry.id),
            )
            await (await get_broadcast()).publish(channel="definitions", message=str(cached_entry.id))
            # await stats.KAFKA_PRODUCER.send("definitions", str(cached_entry.id))
            logger.debug("Managed to submit broadcast definitions for  %s", str(cached_entry.id))
            if refresh:  # we just want to regenerate in the DB, leave now
                return cached_entry

        except sqlalchemy.exc.IntegrityError:
            # we just tried saving an entry that already exists, try to get again
            # it was very likely created in the meanwhile, so we can discard the duplicate
            await db.rollback()
            result = await db.execute(
                select(CachedDefinition).filter_by(
                    source_text=word,
                    from_lang=manager.from_lang,
                    to_lang=manager.to_lang,
                )
            )
            cached_entry = result.scalar_one()

    logger.debug("Just before update_cache at cached_max_timestamp %s", cached_max_timestamp)
    await update_cache(db, manager.from_lang, manager.to_lang, cached_max_timestamp)

    logger.debug("Just after update_cache at cached_max_timestamp %s", cached_max_timestamp)
    return json.loads(cached_definitions[f"{manager.from_lang}:{manager.to_lang}"][word][1])
