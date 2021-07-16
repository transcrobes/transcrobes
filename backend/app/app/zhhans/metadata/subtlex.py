# -*- coding: utf-8 -*-
from __future__ import annotations

import logging
import os
from collections import defaultdict
from typing import Any

from app.enrich.data import PersistenceProvider
from app.enrich.metadata import Metadata
from app.models.migrated import ZhSubtlexLookup
from app.zhhans_en.translate import decode_phone  # FIXME: decode_pinyin should not be in a lang_pair
from sqlalchemy.ext.asyncio.session import AsyncSession

logger = logging.getLogger(__name__)  # FIXME: add some logging

"""
see https://www.ugent.be/pp/experimentele-psychologie/en/research/documents/subtlexch
following file adapted from subtlexch131210.zip, basically removed useless cedict translations
and fixed incorrect pinyin 'ue:' -> 'u:e'
"""


class ZH_SubtlexMetadata(PersistenceProvider, Metadata):
    model_type = ZhSubtlexLookup

    def __init__(self, config):
        super().__init__(config)
        self.model_type = ZhSubtlexLookup

    @staticmethod
    def _decode_pinyin(s: str) -> str:
        # FIXME: don't use the generic decode_pinyin
        return decode_phone(s)

    def _load(self):
        # see https://www.ugent.be/pp/experimentele-psychologie/en/research/documents/subtlexch/webpage.doc
        # file slightly modified, see above
        # Word
        # Length
        # Pinyin
        # Pinyin.Input
        # WCount
        # W.million
        # log10W
        # W-CD
        # W-CD%
        # log10CD
        # Dominant.PoS
        # Dominant.PoS.Freq
        # All.PoS
        # All.PoS.Freq

        # Peking University classification
        # see https://www.ugent.be/pp/experimentele-psychologie/en/research/documents/subtlexch/webpage.doc
        # a         adjective
        # ad        adjective as adverbial
        # ag        adjective morpheme
        # an        adjective with nominal function
        # b          non-predicate adjective
        # c           conjunction
        # d           adverb
        # dg         adverb morpheme
        # e           interjection
        # f            directional locality
        # g           morpheme
        # h           prefix
        # i            idiom
        # j            abbreviation
        # k           suffix
        # l            fixed expressions
        # m         numeral
        # mg       numeric morpheme
        # n           common noun
        # ng         noun morpheme
        # nr          personal name
        # ns         place name
        # nt          organization name
        # nx         nominal character string
        # nz         other proper noun
        # o           onomatopoeia
        # p           preposition
        # q           classifier
        # r            pronoun
        # rg          pronoun morpheme
        # s           space word
        # t            time word
        # tg          time word morpheme
        # u           auxiliary
        # v           verb
        # vd         verb as adverbial
        # vg         verb morpheme
        # vn         verb with nominal function
        # w          symbol and non-sentential punctuation
        # x           unclassified items
        # y           modal particle
        # z           descriptive

        dico = defaultdict(list)
        logger.info("Starting population of ZH subtlex")

        if not os.path.exists(self._config["path"]):
            logger.error(f"Should have loaded the file {self._config['path']} but it doesn't exist")
            return dico

        with open(self._config["path"], "r") as data_file:
            next(data_file)  # skip the header line
            for line in data_file:
                li = line.strip().split("\t")
                w = li[0]
                dico[w].append(
                    {
                        "pinyin": ZH_SubtlexMetadata._decode_pinyin(li[2]),  # can be several, separated by /
                        "wcpm": li[5],  # word count per million
                        "wcdp": li[8],  # % of film subtitles that had the char at least once
                        "pos": li[12],  # all POS found, most frequent first
                        "pos_freq": li[13],  # nb of occurences by POS
                    }
                )

                if not line.strip():
                    continue

        logger.info(f"Finished populating ZH subtlex, there are {len(list(dico.keys()))} entries")

        return dico

    # override Metadata
    @staticmethod
    def name() -> str:
        return "frq"

    # override Metadata
    async def meta_for_word(self, db: AsyncSession, lword: str) -> Any:
        return await self.entry(db, lword)
