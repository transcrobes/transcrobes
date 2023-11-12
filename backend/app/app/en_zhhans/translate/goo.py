# -*- coding: utf-8 -*-

import logging
import re

from app.enrich.data import PersistenceProvider
from app.enrich.models import Token
from app.enrich.translate import Translator
from app.etypes import EntryDefinition
from app.models.lookups import EnZhhansGoogLookup
from app.ndutils import lemma
from sqlalchemy.ext.asyncio.session import AsyncSession

logger = logging.getLogger(__name__)


"""
GOO pos, only including values actually found in the DB
pos_enum, pos
1.  noun
2.  verb
3.  adjective
4.  adverb
5.  preposition
6.  abbreviation
7.  conjunction
8.  pronoun
9.  interjection
10. phrase
11. prefix
12. suffix
13. article
15. ""
16. auxiliary verb
19. particle
"""

EN_TB_POS_TO_GOO_POS = {
    "PU": "other",  # Punctuation
    "ADD": "other",  # ???
    "AFX": "other",  # affix
    "GW": "other",  # something like "goes with"???
    "HYPH": "other",  # hyphen???
    "NFP": "other",  # ???
    "XX": "other",  #
    "CC": "conjunction",  # Coordinating conjunction
    "CD": "noun",  # Cardinal number
    "DT": "article",  # Determiner
    "EX": "noun",  # Existential there
    "FW": "noun",  # Foreign word
    "IN": "preposition",  # Preposition or subordinating conjunction
    "JJ": "adjective",  # Adjective
    "JJR": "adjective",  # Adjective, comparative
    "JJS": "adjective",  # Adjective, superlative
    "LS": "noun",  # List item marker ???
    "MD": "auxiliary verb",  # Modal
    "NN": "noun",  # Noun, singular or mass
    "NNS": "noun",  # Noun, plural
    "NNP": "noun",  # Proper noun, singular
    "NNPS": "noun",  # Proper noun, plural
    "PDT": "article",  # Predeterminer
    "POS": "noun",  # Possessive ending ???
    "PRP": "pronoun",  # Personal pronoun
    "PRP$": "pronoun",  # Possessive pronoun
    "RB": "adverb",  # Adverb
    "RBR": "adverb",  # Adverb, comparative
    "RBS": "adverb",  # Adverb, superlative
    "RP": "particle",  # Particle
    "SYM": "noun",  # Symbol ???
    "TO": "particle",  # to
    "UH": "interjection",  # Interjection
    "VB": "verb",  # Verb, base form
    "VBD": "verb",  # Verb, past tense
    "VBG": "verb",  # Verb, gerund or present participle
    "VBN": "verb",  # Verb, past participle
    "VBP": "verb",  # Verb, non-3rd person singular present
    "VBZ": "verb",  # Verb, 3rd person singular present
    "WDT": "article",  # Wh-determiner
    "WP": "pronoun",  # Wh-pronoun
    "WP$": "pronoun",  # Possessive wh-pronoun
    "WRB": "adverb",  # Wh-adverb
}


class EN_ZHHANS_GoogDictTranslator(PersistenceProvider, Translator):
    model_type = EnZhhansGoogLookup

    def __init__(self, config):
        super().__init__(config)

    p = re.compile(r"^(\d*)(\w+)(\S*)\s+(.+)$")

    # override Metadata
    @staticmethod
    def name():
        return EN_ZHHANS_GoogDictTranslator.model_type.SHORT_NAME

    def _load(self):
        raise NotImplementedError

    # TODO: fix the POS correspondences
    # override Translator
    async def get_standardised_defs(self, db: AsyncSession, token: Token, all_forms: bool = False) -> EntryDefinition:
        std_format = {}
        entry = await self._get_def(db, token["lemma"])
        if entry:
            logger.debug("'%s' is in gooendict cache", token["lemma"])
            for goog in entry:
                logger.debug("Iterating on '%s''s different definitions in gooendict cache", token["lemma"])

                for defin in goog["dict"]:
                    token_pos = EN_TB_POS_TO_GOO_POS[token["pos"]]

                    if not defin["pos"] in std_format:
                        std_format[defin["pos"]] = []
                    for translation in defin["entry"]:
                        confidence = translation["score"]
                        defie = {
                            "upos": token_pos,
                            "opos": defin["pos"],
                            "normalizedTarget": translation["word"],
                            "confidence": confidence,
                            "trans_provider": "GOOENDICT",
                        }
                        if "sentences" in defin and len(defin["sentences"]) > 0:
                            for sent in defie["sentences"]:
                                if "src_translit" in sent:
                                    defie["phone"] = sent["src_translit"]
                                    break
                        std_format[defin["pos"]].append(defie)

        if all_forms:
            pass
        return std_format

    # override Translator
    async def get_standardised_fallback_defs(
        self, db: AsyncSession, token: Token, all_forms: bool = False
    ) -> EntryDefinition:
        # TODO: do something better than this!
        return await self.get_standardised_defs(db, token)

    # override Translator
    async def pos_synonyms(self, _db: AsyncSession, _token: Token):
        raise NotImplementedError

    # override Translator
    async def sound_for(self, db: AsyncSession, token: Token) -> str:
        entry = await self._get_def(db, lemma(token))
        if entry:
            logger.debug("'%s' is in abcdict cache", lemma(token))
            for abc in entry:
                return abc.get("phone")
        return ""
