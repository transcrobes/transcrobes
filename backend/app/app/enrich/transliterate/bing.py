# -*- coding: utf-8 -*-
from __future__ import annotations

# import orjson as json
import json
import logging

import sqlalchemy
from app.cache import caches
from app.enrich.apis.bing import BingAPI
from app.enrich.transliterate import Transliterator
from app.models.lookups import BingApiTransliteration
from sqlalchemy.ext.asyncio.session import AsyncSession
from sqlalchemy.future import select

logger = logging.getLogger(__name__)

TRANSLIT_PATH = "/transliterate"


class BingTransliterator(Transliterator, BingAPI):
    def __init__(self, config):
        super().__init__(config)
        self._from_script = config["from_script"]
        self._to_script = config["to_script"]
        self._inmem = config["inmem"]

    # override Transliterator
    @staticmethod
    def name():
        return "best"

    def translit_params(self):
        return {
            **self.default_params(),
            **{
                "language": self.from_lang,
                "fromScript": self._from_script,
                "toScript": self._to_script,
            },
        }

    async def _ask_bing_transliterate(self, db: AsyncSession, content: str, refresh: bool = False):
        val = None
        if self._inmem:
            val = caches["bing_transliterate"].get(content)
            if val is not None and not refresh:
                return val

        result = await db.execute(
            select(BingApiTransliteration).filter_by(
                source_text=content, from_lang=self.from_lang, to_lang=self.to_lang
            )
        )
        found = result.scalar_one_or_none()
        logger.debug("Found %s element in db for %s", found, content)

        if found is None or refresh:
            bing_json = await self._ask_bing_api(content, TRANSLIT_PATH, self.translit_params())

            bing = found or BingApiTransliteration(source_text=content, from_lang=self.from_lang, to_lang=self.to_lang)
            bing.response_json = bing_json
            try:
                db.add(bing)
                await db.commit()
                val = bing.response_json
            except sqlalchemy.exc.IntegrityError:
                # we just tried saving an entry that already exists, try to get again
                logger.debug(
                    "Tried saving BingAPITransliteration for %s that already exists, try to get again",
                    bing.source_text,
                )
                await db.rollback()
                result = await db.execute(
                    select(BingApiTransliteration).filter_by(
                        source_text=content,
                        from_lang=self.from_lang,
                        to_lang=self.to_lang,
                    )
                )
                found = result.scalar_one()
                val = found.response_json
        else:
            val = found.response_json  # TODO: be better, just being dumb for the moment

        if self._inmem:
            caches["bing_transliterate"].set(content, val)
        return val

    async def transliterate(self, db: AsyncSession, text: str, refresh: bool = False):
        jresult = json.loads(await self._ask_bing_transliterate(db, text, refresh=refresh))
        logging.debug("Returning Bing transliteration '%s' for '%s'", jresult[0]["text"], text)
        return jresult[0]["text"]
