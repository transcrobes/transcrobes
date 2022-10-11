# -*- coding: utf-8 -*-
from __future__ import annotations

import logging
import os
from collections import defaultdict
from typing import Any

from app.enrich.data import PersistenceProvider
from app.enrich.metadata import Metadata
from app.models.lookups import ZhHskLookup
from sqlalchemy.ext.asyncio.session import AsyncSession

logger = logging.getLogger(__name__)  # FIXME: add some logging

"""
Load unmodified HSK files and make available either inmem or in the DB
see http://www.hskhsk.com/word-lists.html
data from http://data.hskhsk.com/lists/
files renamed "HSK Official With Definitions 2012 L?.txt" ->  hsk?.txt
"""


class ZH_HSKMetadata(PersistenceProvider, Metadata):
    model_type = ZhHskLookup

    def __init__(self, config):
        super().__init__(config)
        self.model_type = ZhHskLookup

    def _load(self):
        dico = defaultdict(list)
        logger.info("Starting population of hsk")
        for i in range(1, 7):
            if not os.path.isfile(self._config["path"].format(i)):
                logger.error(f"Should have loaded the file {self._config['path']} but it doesn't exist")
                continue

            with open(self._config["path"].format(i), "r") as data_file:
                for line in data_file:
                    # 爱	愛	ai4	ài	love
                    li = line.strip().split("\t")
                    dico[li[0]].append({"pinyin": li[3], "hsk": i})

        logger.info("Finished populating hsk, there are %s entries", len(list(dico.keys())))
        return dico

    # override Metadata
    @staticmethod
    def name() -> str:
        return ZH_HSKMetadata.model_type.SHORT_NAME

    # override Metadata
    async def meta_for_word(self, db: AsyncSession, lword) -> Any:
        return await self.entry(db, lword)
