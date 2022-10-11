# -*- coding: utf-8 -*-
from __future__ import annotations

import logging
import os
import re

from app.enrich.data import PersistenceProvider
from app.enrich.translate import Translator
from app.etypes import EntryDefinition, Token
from app.models.lookups import ZhhansEnCCCLookup
from app.ndutils import lemma
from app.zhhans import ZH_TB_POS_TO_SIMPLE_POS
from sqlalchemy.ext.asyncio.session import AsyncSession

logger = logging.getLogger(__name__)


class WordDefinition:
    phone: str
    definitions: list[str]


WordDictionary = dict[str, list[WordDefinition]]

pinyinToneMarks = {
    "a": "āáǎà",
    "e": "ēéěè",
    "i": "īíǐì",
    "o": "ōóǒò",
    "u": "ūúǔù",
    "ü": "ǖǘǚǜ",
    "A": "ĀÁǍÀ",
    "E": "ĒÉĚÈ",
    "I": "ĪÍǏÌ",
    "O": "ŌÓǑÒ",
    "U": "ŪÚǓÙ",
    "Ü": "ǕǗǙǛ",
}


def convertPinyinCallback(m):
    tone = int(m.group(3)) % 5
    r = m.group(1).replace("v", "ü").replace("V", "Ü")
    # for multple vowels, use first one if it is a/e/o, otherwise use second one
    pos = 0
    if len(r) > 1 and not r[0] in "aeoAEO":
        pos = 1
    if tone != 0:
        r = r[0:pos] + pinyinToneMarks[r[pos]][tone - 1] + r[pos + 1 :]  # noqa: E203
    return r + m.group(2)


def convertPinyin(s):
    return re.sub(r"([aeiouüvÜ]{1,3})(n?g?r?)([012345])", convertPinyinCallback, s, flags=re.IGNORECASE)


class ZHHANS_EN_CCCedictTranslator(PersistenceProvider, Translator):
    model_type = ZhhansEnCCCLookup

    def __init__(self, config):
        super().__init__(config)

    # override PersistenceProvider
    def _load(self) -> WordDictionary:
        """
        Loads from an unmodified CC-Cedict file
        We basically just straight load the file, though we ignore the Traditional characters
        """
        logger.info("Populating cedict")
        dico = WordDictionary()

        if not os.path.exists(self._config["path"]):
            logger.error(f"Should have loaded the file {self._config['path']} but it doesn't exist")
            return dico

        with open(self._config["path"], "r", encoding="utf8") as data_file:
            for line in data_file:
                line = line.strip()
                if line.startswith("#"):
                    continue
                regex = r"^(\S+)\s+(\S+)\s+(\[[^]]+\])\s+(\/.*\/)$"

                match = re.search(regex, line)
                if not match:
                    continue
                if not match.group(2) in dico:
                    dico[match.group(2)] = []

                dico[match.group(2)].append(
                    {
                        "phone": match.group(3),
                        "definitions": match.group(4).strip("/").split("/"),
                    }
                )

        logger.info("Finished populating cedict, there are %s entries", len(list(dico.keys())))
        return dico

    # override Translator
    @staticmethod
    def name() -> str:
        return ZHHANS_EN_CCCedictTranslator.model_type.SHORT_NAME

    @staticmethod
    def _decode_phone(s: str) -> str:
        return convertPinyin(s)

    def _def_from_entry(self, token: Token, cccl) -> EntryDefinition:
        std_format = EntryDefinition()

        if cccl:
            logger.debug("'%s' is in cccedict cache", lemma(token))
            for cc in cccl:
                logger.debug(
                    "Iterating on '%s''s different forms in cccedict cache",
                    lemma(token),
                )
                for defin in cc["definitions"]:
                    logger.debug(
                        "Iterating on '%s''s different definitions in cccedict cache",
                        lemma(token),
                    )
                    logger.debug("Checking for POS hint for '%s' in cccedict", lemma(token))
                    token_pos = ZH_TB_POS_TO_SIMPLE_POS[token["pos"]]

                    if defin.startswith("to "):
                        defin_pos = "VERB"
                    elif defin.startswith("a "):
                        defin_pos = "NOUN"
                    else:
                        defin_pos = "OTHER"

                    if defin_pos not in std_format:
                        std_format[defin_pos] = []

                    confidence = 0

                    if (token_pos == "VERB" and defin_pos == "VERB") or (token_pos == "NOUN" and defin_pos == "NOUN"):
                        confidence = 0.01

                    defie = {
                        "upos": defin_pos,
                        "opos": defin_pos,
                        "normalizedTarget": defin,
                        "confidence": confidence,
                        "trans_provider": "CEDICT",
                    }
                    phone = cc.get("phone") or cc.get("pinyin")
                    defie["phone"] = self._decode_phone(phone) if phone else ""
                    std_format[defin_pos].append(defie)

        logger.debug("Finishing looking up '%s' in cccedict", lemma(token))
        return std_format

    async def get_standardised_defs(self, db: AsyncSession, token: Token, all_forms: bool = False) -> EntryDefinition:
        return self._def_from_entry(token, await self._get_def(db, lemma(token)))

    # TODO: investigate git@github.com:wuliang/CedictPlus.git - it has POS. It also hasn't been updated since 2012...
    # override Translator
    async def get_standardised_fallback_defs(
        self, db: AsyncSession, token: Token, all_forms: bool = False
    ) -> EntryDefinition:
        # TODO: do something better than this!
        return await self.get_standardised_defs(db, token, all_forms)

    # override Translator
    async def pos_synonyms(self, _db: AsyncSession, _token: Token):
        raise NotImplementedError

    # override Translator
    async def sound_for(self, db: AsyncSession, token: Token) -> str:
        cccl = await self._get_def(db, lemma(token))
        if cccl:
            for cc in cccl:
                sound = cc.get("phone") or cc.get("pinyin")
                if sound:
                    return self._decode_phone(sound.replace("[", "").replace("]", ""))
        return ""
