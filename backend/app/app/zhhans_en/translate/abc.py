# -*- coding: utf-8 -*-
from __future__ import annotations

import logging
import os
import re

import unidecode
from app.enrich.data import PersistenceProvider
from app.enrich.etypes import EntryDefinition
from app.enrich.models import Token
from app.enrich.translate import Translator
from app.models.migrated import ZhhansEnABCLookup
from app.ndutils import lemma
from app.zhhans_en.translate import decode_phone
from pinyinsplit import PinyinSplit
from sqlalchemy.ext.asyncio.session import AsyncSession

logger = logging.getLogger(__name__)

# TODO: This was a little arbitrary...
# see https://gitlab.com/Wenlin/WenlinTushuguan/blob/master/Help/abbrev.wenlin
# for the ABC abbrevs. The POS are actually quite dissimilar between CoreNLP and ABC
# with whole categories missing from one or the other (prefix vs preposition) :(
ZH_TB_POS_TO_ABC_POS = {
    "AD": "adv.",  # adverb
    "AS": "a.m.",  # aspect marker
    "BA": "other",  # in ba-construction ,
    "CC": "conj.",  # coordinating conjunction
    "CD": "num.",  # cardinal number ???
    "CS": "conj.",  # subordinating conjunction ???
    "DEC": "other",  # in a relative-clause ??? maybe 's.p.'
    "DEG": "other",  # associative ???
    "DER": "other",  # in V-de const. and V-de-R ???
    "DEV": "other",  # before VP
    "DT": "pr.",  # determiner ??? always appear to be as pr in the ABC
    "ETC": "suf.",  # for words , ,
    "FW": "other",  # foreign words
    "IJ": "intj.",  # interjection
    "JJ": "attr.",  # other noun-modifier ,
    "LB": "other",  # in long bei-const ,
    "LC": "other",  # localizer
    "M": "m.",  # measure word
    "MSP": "other",  # other particle
    "NN": "n.",  # common noun
    "NR": "n.",  # proper noun
    "NT": "n.",  # temporal noun
    "OD": "num.",  # ordinal number
    "ON": "on.",  # onomatopoeia ,
    "P": "other",  # preposition excl. and
    "PN": "pr.",  # pronoun
    "PU": "other",  # punctuation
    "SB": "other",  # in short bei-const ,
    "SP": "other",  # sentence-final particle
    "VA": "s.v.",  # predicative adjective
    "VC": "v.",
    "VE": "v.",  # as the main verb
    "VV": "v.",  # other verb
    # Others added since then
    "URL": "other",
}


class ZHHANS_EN_ABCDictTranslator(PersistenceProvider, Translator):
    SHORT_NAME = "abc"
    p = re.compile(r"^(\d*)(\w+)(\S*)\s+(.+)$")
    model_type = ZhhansEnABCLookup

    def __init__(self, config):
        super().__init__(config)
        self.model_type = ZhhansEnABCLookup

    # FIXME: this definitely needs to be refactored!
    # FIXME: make this async aiofiles
    def _load(self):  # pylint: disable=R0912,R0915  # noqa:C901
        cur_pos = ""

        logger.info("Starting population of abcdict")
        ignore = 0
        entry = None
        dico = {}

        if not os.path.exists(self._config["path"]):
            logger.error(f"Should have loaded the file {self._config['path']} but it doesn't exist")
            return dico

        with open(self._config["path"], "r", encoding="utf8") as data_file:
            for line in data_file:
                # ignore non-useful lines
                if line.strip() in [
                    "cidian.wenlindb",
                    ".-arc",
                    ".-publish",
                    "--meta--",
                ]:
                    continue
                if not line.strip():
                    ignore = 0
                    continue
                if line.strip() == "h":
                    ignore = 1
                    continue
                if ignore == 1:
                    continue

                # start a new entry
                if line.startswith(".py   "):
                    uid = line[6:].strip()
                    if entry:  # flush the previous entry
                        # if entry['pinyin'] in p_entries: raise Exception("looks like we would squash, not good")
                        # p_entries[entry['pinyin']] = entry

                        if entry["char"] in dico:
                            dico[entry["char"]].append(entry)
                        else:
                            dico[entry["char"]] = [entry]

                    entry = {"pinyin": uid, "definitions": [], "els": [], "parents": {}}
                    cur_pos = ""
                    continue

                m = self.p.match(line)

                if m.group(2) in ["rem"]:
                    continue  # comments

                if m.group(2) in ["ser", "ref", "freq", "hh"] and not m.group(1):
                    entry[m.group(2)] = m.group(4)
                elif m.group(2) in ["char"]:
                    entry[m.group(2)] = m.group(4).split("[")[
                        0
                    ]  # only get simplified, traditional is in brackets after
                elif m.group(2) == "gr" and not m.group(1):  # entry-level grade
                    entry[m.group(2)] = m.group(4)
                elif m.group(2) in ["ps"]:
                    cur_pos = m.group(4)
                    entry["els"].append([m.group(1), m.group(2), m.group(4)])
                elif m.group(2) in ["en"]:
                    entry["els"].append([m.group(1), m.group(2), m.group(4)])
                else:
                    entry["els"].append([m.group(1), m.group(2), m.group(4)])
                    if m.group(2) in ["df"]:
                        entry["definitions"].append([m.group(1), cur_pos, m.group(4)])

            if entry:  # flush the last entry
                # if entry['pinyin'] in p_entries: raise Exception("looks like we would squash, not good")
                # p_entries[entry['pinyin']] = entry

                if entry["char"] in dico:
                    dico[entry["char"]].append(entry)
                else:
                    dico[entry["char"]] = [entry]

        logger.info("Finished populating abcdict, there are %s entries", len(list(dico.keys())))
        return dico

    # override Metadata
    @staticmethod
    def name() -> str:
        return ZHHANS_EN_ABCDictTranslator.SHORT_NAME

    @staticmethod
    def _decode_pinyin(s: str) -> str:
        accented_array = []
        for ses in s.split():
            joined = decode_phone(ses.removesuffix("*").removesuffix("(r)"))
            er_huared = joined.split("/")[0]
            er_huared = unidecode.unidecode(er_huared).lower()
            if er_huared.endswith("r") and not er_huared.endswith("er"):
                er_huared = er_huared.removesuffix("r") + "er"
            if not PinyinSplit().split(er_huared):
                continue
            unaccented_splited = PinyinSplit().split(er_huared)[0]
            cur = 0
            for word in unaccented_splited:
                accented_array.append(joined[cur : cur + len(word)])  # noqa: E203
                cur += len(word)
        return " ".join(accented_array)

    def _def_from_entry(self, token: Token, entry) -> EntryDefinition:
        std_format = EntryDefinition()
        if entry:
            logger.debug("'%s' is in abcdict cache", lemma(token))
            for abc in entry:
                logger.debug(
                    "Iterating on '%s''s different definitions in abcdict cache",
                    lemma(token),
                )
                for defin in abc["definitions"]:
                    token_pos = ZH_TB_POS_TO_ABC_POS[token["pos"]]

                    if not defin[1] in std_format:
                        std_format[defin[1]] = []

                    if token_pos == defin[1]:
                        confidence = 0.01
                    else:
                        confidence = 0

                    defie = {
                        "upos": token_pos,
                        "opos": defin[1],
                        "normalizedTarget": defin[2],
                        "confidence": confidence,
                        "trans_provider": "ABCDICT",
                    }
                    defie["pinyin"] = self._decode_pinyin(abc["pinyin"])
                    std_format[defin[1]].append(defie)

        logger.debug("Finishing looking up '%s' in abcedict", lemma(token))
        return std_format

    # TODO: fix the POS correspondences
    # override Translator
    async def get_standardised_defs(self, db: AsyncSession, token: Token) -> EntryDefinition:
        return self._def_from_entry(token, await self._get_def(db, lemma(token)))

    # override Translator
    async def get_standardised_fallback_defs(self, db: AsyncSession, token: Token) -> EntryDefinition:
        # TODO: do something better than this!
        return self.get_standardised_defs(db, token)

    # override Translator
    async def pos_synonyms(self, _db: AsyncSession, _token: Token):
        raise NotImplementedError

    # override Translator
    async def sound_for(self, db: AsyncSession, token: Token) -> str:
        entry = await self._get_def(db, lemma(token))
        if entry:
            logger.debug("'%s' is in abcdict cache", lemma(token))
            for abc in entry:
                return self._decode_pinyin(abc.get("pinyin") or abc.get("phone"))
        return ""
