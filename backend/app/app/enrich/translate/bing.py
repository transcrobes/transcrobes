# -*- coding: utf-8 -*-
from __future__ import annotations

import json  # import orjson as json
import logging
from collections import defaultdict

import sqlalchemy
from app.cache import caches
from app.enrich.apis.bing import BingAPI
from app.enrich.translate import DefaultTranslator
from app.enrich.transliterate import Transliterator
from app.etypes import Token
from app.models.lookups import BingApiLookup, BingApiTranslation
from app.ndutils import lemma
from sqlalchemy.ext.asyncio.session import AsyncSession
from sqlalchemy.future import select

logger = logging.getLogger(__name__)

LOOKUP_PATH = "/dictionary/lookup"
TRANSLAT_PATH = "/translate"


class BingTranslator(DefaultTranslator, BingAPI):
    def __init__(self, config, transliterator: Transliterator):
        super().__init__(config)
        self._transliterator: Transliterator = transliterator
        self._inmem: bool = config["inmem"]

    # override Translator
    @staticmethod
    def name() -> str:
        return BingApiLookup.SHORT_NAME

    # override DefaultTranslator
    @staticmethod
    def fallback_name() -> str:
        return BingApiLookup.FALLBACK_SHORT_NAME

    # public override methods
    async def get_standardised_defs(self, db: AsyncSession, token: Token, all_forms: bool = False):
        result = await self._ask_bing_lookup(db, lemma(token))
        try:
            jresult = json.loads(result)
        except json.decoder.JSONDecodeError:
            logger.error(result)
            raise
        bing = jresult[0]["translations"]
        std_format = {}

        for trans in bing:
            if not trans["posTag"] in std_format:
                std_format[trans["posTag"]] = []
            defie = {
                "upos": trans["posTag"],
                "opos": trans["posTag"],
                "normalizedTarget": trans["normalizedTarget"],
                "confidence": trans["confidence"],
                "trans_provider": "BING",
            }

            defie["p"] = await self._transliterator.transliterate(db, lemma(token))
            std_format[trans["posTag"]].append(defie)

        return std_format

    async def get_standardised_fallback_defs(self, db: AsyncSession, token: Token, all_forms: bool = False):
        result = await self._ask_bing_translate(db, lemma(token), is_fallback=True)

        try:
            jresult = json.loads(result)
        except json.decoder.JSONDecodeError:
            logger.error(f"{lemma(token)} is loaded with bing json {result=}")
            raise

        try:
            translation = jresult[0]["translations"][0]["text"]
        except IndexError:
            logger.error(f"{lemma(token)} is translated with bing json {result=}")
            raise

        std_format = [
            {
                "upos": "OTHER",
                "opos": "OTHER",
                "normalizedTarget": translation,
                "confidence": 0,
                "trans_provider": "BING-DEFAULT",
            }
        ]
        std_format[0]["p"] = await self._transliterator.transliterate(db, lemma(token))

        return {"OTHER": std_format}

    # override
    async def translate(self, db: AsyncSession, text: str):
        jresult = json.loads(await self._ask_bing_translate(db, text, is_fallback=False))

        translation = jresult[0]["translations"][0]["text"]
        logging.debug("Returning Bing translation '%s' for '%s'", translation, text)
        return translation, jresult[0]["translations"][0].get("alignment")

    async def pos_synonyms(self, db: AsyncSession, token):  # noqa:C901  # pylint: disable=R0914
        """
        Return the Bing reverse translations (aka synonyms) for translations in the lookup
        """
        MAX_REVERSE_TRANSLATION_SOURCES = 3

        # get the MAX_REVERSE_TRANSLATION_SOURCES most confident translations from db or cache
        # that have the POS we are looking for, in order of most confident
        jresult = json.loads(await self._ask_bing_lookup(db, lemma(token)))
        if len(jresult[0]["translations"]) < 1:
            return {}

        translations_by_pos = defaultdict(list)

        for val in jresult[0]["translations"]:
            translations_by_pos[val["posTag"]].append(val)

        all_pos_synonyms = {}
        for pos, same_pos in translations_by_pos.items():
            sorted_defs = sorted(same_pos, key=lambda i: i["confidence"], reverse=True)[
                :MAX_REVERSE_TRANSLATION_SOURCES
            ]

            # From those upto MAX_REVERSE_TRANSLATION_SOURCES found, get the most frequent reverse translations,
            # with (hopefully? is my algo ok???) upto max_synonyms, but leaving a single spot free if we have
            # sources left... Basically, if we want 5 and MAX_REVERSE_TRANSLATION_SOURCES is 3, then get 3 from the
            # first and 1 each from sources two and three
            best_count = MAX_REVERSE_TRANSLATION_SOURCES
            best_synonyms = []
            i = 0
            sorted_bts = sorted(
                sorted_defs[0]["backTranslations"],
                key=lambda i: i["frequencyCount"],
                reverse=True,
            )
            while len(best_synonyms) <= best_count and i < len(sorted_bts):
                word = sorted_defs[0]["backTranslations"][i]["normalizedText"]
                if word != lemma(token) and word not in best_synonyms:
                    best_synonyms.append(word)
                i += 1

            best_count += 1
            if len(sorted_defs) > 1:
                i = 0
                while len(best_synonyms) <= best_count and i < len(sorted_defs[1]["backTranslations"]):
                    word = sorted_defs[1]["backTranslations"][i]["normalizedText"]
                    if word != lemma(token) and word not in best_synonyms:
                        best_synonyms.append(word)
                    i += 1

            best_count += 1
            if len(sorted_defs) > 2:
                i = 0
                while len(best_synonyms) <= best_count and i < len(sorted_defs[2]["backTranslations"]):
                    word = sorted_defs[2]["backTranslations"][i]["normalizedText"]
                    if word != lemma(token) and word not in best_synonyms:
                        best_synonyms.append(sorted_defs[2]["backTranslations"][i]["normalizedText"])
                    i += 1

            if best_synonyms:
                all_pos_synonyms[pos] = best_synonyms

        return all_pos_synonyms

    def _translate_params(self):
        return {**self.default_params(), **{"includeAlignment": "true"}}

    async def _ask_bing_lookup(self, db: AsyncSession, content: str) -> str:
        if not content:  # calling the api with empty string will put rubbish in the DB
            return None

        val = None
        if self._inmem:
            val = caches["bing_lookup"].get(content)
            if val:
                return val

        result = await db.execute(
            select(BingApiLookup).filter_by(source_text=content, from_lang=self.from_lang, to_lang=self.to_lang)
        )
        found = result.scalar_one_or_none()

        logger.debug("Found %s elements in db for %s", found, content)
        if not found:
            bing_json: str = await self._ask_bing_api(content, LOOKUP_PATH, self.default_params())
            bing = BingApiLookup(
                source_text=content,
                response_json=bing_json,
                from_lang=self.from_lang,
                to_lang=self.to_lang,
            )
            try:
                db.add(bing)
                await db.commit()
                val = bing.response_json
            except sqlalchemy.exc.IntegrityError:
                # we just tried saving an entry that already exists, try to get again
                logger.debug(
                    "Tried saving BingAPILookup for %s that already exists, try to get again",
                    bing.source_text,
                )
                await db.rollback()
                result = await db.execute(
                    select(BingApiLookup).filter_by(
                        source_text=content,
                        from_lang=self.from_lang,
                        to_lang=self.to_lang,
                    )
                )
                found = result.scalar_one()
                val = found.response_json
        else:
            val = found.response_json
        if self._inmem:
            caches["bing_lookup"].set(content, val)
        return val

    async def _ask_bing_translate(self, db: AsyncSession, content: str, is_fallback: bool = False) -> str:
        if not content:  # calling the api with empty string will put rubbish in the DB
            return None

        val = None
        if self._inmem and is_fallback:
            val = caches["bing_translate"].get(content)
            if val:
                return val

        result = await db.execute(
            select(BingApiTranslation).filter_by(source_text=content, from_lang=self.from_lang, to_lang=self.to_lang)
        )
        found = result.scalar_one_or_none()

        logger.debug("Found %s elements in db for %s", found, content)

        if not found:
            bing_json = await self._ask_bing_api(content, TRANSLAT_PATH, self._translate_params())

            bing = BingApiTranslation(
                source_text=content,
                response_json=bing_json,
                from_lang=self.from_lang,
                to_lang=self.to_lang,
            )
            try:
                db.add(bing)
                await db.commit()
                val = bing.response_json
            except sqlalchemy.exc.IntegrityError:
                # we just tried saving an entry that already exists, try to get again
                logger.debug(
                    "Tried saving BingAPITranslation for %s that already exists, try to get again",
                    bing.source_text,
                )
                await db.rollback()
                result = await db.execute(
                    select(BingApiTranslation).filter_by(
                        source_text=content,
                        from_lang=self.from_lang,
                        to_lang=self.to_lang,
                    )
                )
                found = result.scalar_one()
                if found:
                    val = found.response_json
                else:
                    raise
        else:
            val = found.response_json
        if self._inmem and is_fallback:
            caches["bing_translate"].set(content, val)
        return val

    # override Translator
    async def sound_for(self, db: AsyncSession, token: Token):
        return await self._transliterator.transliterate(db, lemma(token))
