# -*- coding: utf-8 -*-
from __future__ import annotations

import datetime
import json
import logging
import re
from collections import defaultdict
from typing import TYPE_CHECKING, Tuple

import sqlalchemy
from app.api.api_v1.subs import publish_message
from app.cache import TimestampedDict, cache_loading, cached_definitions  # noqa:F401
from app.data.context import get_broadcast
from app.etypes import Token
from app.models.data import CachedDefinition
from app.models.lookups import BingApiLookup
from app.ndutils import clean_definitions, lemma, orig_text
from sqlalchemy import and_, func, or_
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
    cache_key = f"{from_lang}:{to_lang}"
    if not cached_definitions[cache_key] and cache_loading.get(cache_key):
        raise Exception("Cache loading, please come again")

    # cache_loading = True  # avoid trashing with a global flag to reduce the number of loads, saving the DB
    cache_loading[cache_key] = True  # avoid trashing with a global flag to reduce the number of loads, saving the DB

    if cached_max_timestamp == 0 and cached_definitions[cache_key]:
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
    new_cache = defaultdict(TimestampedDict)
    for cached_entry in result.scalars().all():
        prev_dict = (
            new_cache.get(cached_entry.source_text.lower())
            or cached_definitions[cache_key][cached_entry.source_text.lower()]
            or (0, None)
        )[1] or {}
        prev_dict[cached_entry.source_text] = (
            cached_entry.cached_date.timestamp(),
            cached_entry.response_json,
            cached_entry.word_id,
        )
        # FIXME: is this necessary? i need for them to be in timestamped order, so
        # my guess is that I need to delete and readd, so that the order is that the most recent is always
        # the last one
        new_cache.pop(cached_entry.source_text.lower(), None)
        new_cache[cached_entry.source_text.lower()] = (
            cached_entry.cached_date.timestamp(),
            prev_dict,
        )

    if cached_definitions[cache_key] and new_cache:
        logger.warning(
            "The new_cache is not empty for ts %s, len %s, new_cache[:100] %s",
            cached_max_timestamp,
            len(new_cache),
            str(new_cache)[:1000],
        )
    cached_definitions[cache_key] = cached_definitions[cache_key] | new_cache
    return cached_definitions[cache_key]


def ordered_defs(all_defs: TimestampedDict, oword: str, word: str) -> list[Tuple[float, str, int]]:
    defs = []
    exact = None
    for k, v in all_defs.items():
        if k == oword:
            defs.insert(0, v)
            exact = v
        elif k == oword.lower() and not exact:
            defs.insert(0, v)
            exact = v
        elif k == word.lower() and not exact:
            defs.insert(0, v)
        else:
            defs.append(v)
    return defs


def all_def_entries(manager: EnrichmentManager, oword: str, word: str):
    lval = cached_definitions[f"{manager.from_lang}:{manager.to_lang}"].get(word.lower()) or (
        0,
        {},
    )
    oval = (
        cached_definitions[f"{manager.from_lang}:{manager.to_lang}"].get(oword.lower())
        or (
            0,
            {},
        )
        if word.lower() != oword.lower()
        else (
            0,
            {},
        )
    )
    return lval[1] | oval[1]


async def definitions(  # pylint: disable=R0914
    db: AsyncSession, manager: EnrichmentManager, otoken: Token, refresh: bool = False
):  # noqa:C901  # pylint: disable=R0912

    word = lemma(otoken)
    oword = orig_text(otoken)
    if not word:  # calling the api with empty string will put rubbish in the DB
        return None

    all_forms = {oword, word, oword.lower(), word.lower()}
    to_get = set()
    if not refresh:
        all_defs = all_def_entries(manager, oword, word)
        for w in all_forms:
            if w not in all_defs:
                to_get.add(w)

        if not to_get:
            return all_defs
    else:
        to_get = all_forms

    filter_exp = and_(
        or_(
            func.lower(CachedDefinition.source_text) == word.lower(),
            func.lower(CachedDefinition.source_text) == oword.lower(),
        )
        if word != oword
        else func.lower(CachedDefinition.source_text) == word.lower(),
        CachedDefinition.from_lang == manager.from_lang,
        CachedDefinition.to_lang == manager.to_lang,
    )

    try:
        # list(dict) appears to be O(n)
        # cached_max_timestamp = list(cached_definitions[f"{manager.from_lang}:{manager.to_lang}"].values())[-1]["ts"]

        # this next(reversed(dict.values())) appears to be O(1)-ish
        cached_max_timestamp = next(reversed(cached_definitions[f"{manager.from_lang}:{manager.to_lang}"].values()))[0]
    except StopIteration:
        logger.warning("Loading cache from scratch, it is completely empty")
        cached_max_timestamp = 0

    cached_entries = (await db.execute(select(CachedDefinition).filter(filter_exp))).scalars().all()
    if not refresh:
        for ce in cached_entries:
            to_get.discard(ce.source_text)

    logger.debug("Found %s element in db for %s : %s, still need %s", cached_entries, word, oword, to_get)
    if to_get:
        for w in to_get:
            # TODO: decide whether this is right
            # create a fake token - here we are searching for all forms, so lemma and word are the same
            token = {"w": w, "pos": "NN", "l": w}
            # this will create the ref entry in the DB if not present
            # WARNING! Do NOT move
            default_definition = clean_definitions(await manager.default().get_standardised_defs(db, token))
            fallback_definition = clean_definitions(await manager.default().get_standardised_fallback_defs(db, token))

            result = await db.execute(
                select(BingApiLookup).filter_by(source_text=w, from_lang=manager.from_lang, to_lang=manager.to_lang)
            )
            bing_word = result.scalar_one()
            json_definition = {
                "w": w,
                "id": bing_word.id,
                "defs": {
                    manager.default().name(): default_definition,
                    manager.default().fallback_name(): fallback_definition,
                },
                "syns": await manager.default().pos_synonyms(db, token),
            }

            sound = await manager.transliterator().transliterate(db, w)
            for x in manager.secondary():
                if not sound or len(hanzi_chars.findall(sound)) != 0:
                    sound = await x.sound_for(db, token)
                json_definition["defs"][x.name()] = clean_definitions(await x.get_standardised_defs(db, token))

            json_definition["p"] = " ".join("?", len(w)) if len(hanzi_chars.findall(sound)) != 0 else sound

            json_definition["metadata"] = {}
            for meta in manager.metadata():
                json_definition["metadata"][meta.name()] = await meta.meta_for_word(db, w)

            definition_object = json.dumps(json_definition, separators=(",", ":"))
            cached_entry = None
            for ce in cached_entries:
                # FIXME: find out why these expire...
                await db.refresh(ce)
                if ce.source_text == w:
                    cached_entry = ce
                    break
            if not cached_entry:
                cached_entry = CachedDefinition(
                    word=bing_word,
                    source_text=w,
                    from_lang=manager.from_lang,
                    to_lang=manager.to_lang,
                )
            cached_entry.response_json = definition_object

            try:
                logger.debug("Before cached_entry.save for %s", str(cached_entry.id))
                db.add(cached_entry)
                await db.commit()
            except sqlalchemy.exc.IntegrityError:
                # we just tried saving an entry that already exists, try to get again
                # it was very likely created in the meanwhile, so we can discard the duplicate
                logger.error("Integrity error while saving %s, %s", w, str(cached_entry))
                await db.rollback()
            except Exception:
                logger.exception("Error while saving %s", w)
                raise

            logger.debug(
                "After cached_entry.save, before publish broadcast definitions",
                str("43"),
            )

        await publish_message(CachedDefinition.__name__, None, await get_broadcast(), user_id=str("42"))
        logger.debug("Managed to submit broadcast definitions for  %s", str("42"))
        if refresh:  # we just want to regenerate in the DB, leave now
            return []

    logger.debug("Just before update_cache at cached_max_timestamp %s", cached_max_timestamp)
    await update_cache(db, manager.from_lang, manager.to_lang, cached_max_timestamp)

    logger.debug("Just after update_cache at cached_max_timestamp %s", cached_max_timestamp)

    return all_def_entries(manager, oword, word)
    # return json.loads(cached_definitions[f"{manager.from_lang}:{manager.to_lang}"][word][1])
