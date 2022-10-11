# -*- coding: utf-8 -*-

"""
This file contains the conversion tables between CoreNLP POS tags (taken from the
Penn Treebank, so for English) and the various supported dictionaries for en
"""

import logging
import re

from app.cache import TimestampedDict
from app.en_zhhans.translate.abc import EN_TB_POS_TO_ABC_POS
from app.enrich import Enricher, best_deep_def
from app.enrich.transliterate import Transliterator
from app.etypes import AnyToken, Token
from app.ndutils import lemma
from sqlalchemy.ext.asyncio.session import AsyncSession

IDEAL_GLOSS_STRING_LENGTH = 2  # pretty random but http://www.pinyin.info/readings/texts/east_asian_languages.html

"""

See https://github.com/stanfordnlp/CoreNLP/blob/16ac6de8b1d5ecd959170ad78ea965ee5fba89a5/data/edu/stanford/nlp/upos/ENUniversalPOS.tsurgeon
Plus see extras

CC Coordinating conjunction
CD Cardinal number
DT Determiner
EX Existential _there_
FW Foreign word
IN Preposition or subordinating conjunction
JJ Adjective
JJR Adjective, comparative
JJS Adjective, superlative
LS List item marker
MD Modal
NN Noun, singular or mass
NNS Noun, plural
NNP Proper noun, singular
NNPS Proper noun, plural
PDT Predeterminer
POS Possessive ending
PRP Personal pronoun
PRP$ Possessive pronoun
RB Adverb
RBR Adverb, comparitive
RBS Adverb, superlative
RP Particle
SYM Symbol
TO _to_
UH Interjection
VB Verb, base form
VBD Verb, past tense
VBG Verb, gerund or present participle
VBN Verb, past participle
VBP Verb, non-3rd person singular present
VBZ Verb, 3rd person singular present
WDT Wh-determiner
WP Wh-pronoun
WP$ Possessive wh-pronoun
WRB Wh-adverb
"""

logger = logging.getLogger(__name__)


"""
Bing/Simple POS
Tag name  Description
ADJ   Adjectives
ADV   Adverbs
CONJ  Conjunctions
DET   Determiners
MODAL Verbs
NOUN  Nouns
PREP  Prepositions
PRON  Pronouns
VERB  Verbs
OTHER Other
"""

CORENLP_EN_IGNORABLE_POS = {
    "PU",  # not a real POS for the EN Universal POS tagset
    "OD",
    "#",
    "$",
    "''",
    ",",
    "-LRB-",
    "-RRB-",
    ".",
    ":",
    "``",
    "LS",
    "SYM",
    "HYPH",
    "NFP",
    "XX",
}
# CORENLP_EN_IGNORABLE_POS_SHORT = {"???"}

EN_TB_PUNCTUATION = {
    "#": "OTHER",  # Punctuation
    "$": "OTHER",  # Punctuation
    "''": "OTHER",  # Punctuation
    ",": "OTHER",  # Punctuation
    "-LRB-": "OTHER",  # Punctuation brackets
    "-RRB-": "OTHER",  # Punctuation brackets
    ".": "OTHER",  # Punctuation
    ":": "OTHER",  # Punctuation
    "``": "OTHER",  # Punctuation
}

EN_TB_POS_TO_SIMPLE_POS = {
    "#": "OTHER",  # Punctuation
    "$": "OTHER",  # Punctuation
    "''": "OTHER",  # Punctuation
    ",": "OTHER",  # Punctuation
    "-LRB-": "OTHER",  # Punctuation brackets
    "-RRB-": "OTHER",  # Punctuation brackets
    ".": "OTHER",  # Punctuation
    ":": "OTHER",  # Punctuation
    "CC": "CONJ",  # Coordinating conjunction
    "CD": "DET",  # Cardinal number
    "DT": "DET",  # Determiner
    "EX": "OTHER",  # Existential _there_
    "FW": "OTHER",  # Foreign word
    "IN": "PREP",  # Preposition or subordinating conjunction
    "JJ": "ADJ",  # Adjective
    "JJR": "ADJ",  # Adjective, comparative
    "JJS": "ADJ",  # Adjective, superlative
    "LS": "OTHER",  # List item marker
    "MD": "OTHER",  # Modal
    "NN": "NOUN",  # Noun, singular or mass
    "NNP": "NOUN",  # Proper noun, singular
    "NNPS": "NOUN",  # Proper noun, plural
    "NNS": "NOUN",  # Noun, plural
    "PDT": "DET",  # Predeterminer
    "POS": "OTHER",  # Possessive ending
    "PRP": "PRON",  # Personal pronoun
    "PRP$": "PRON",  # Possessive pronoun
    "RB": "ADV",  # Adverb
    "RBR": "ADV",  # Adverb, comparitive
    "RBS": "ADV",  # Adverb, superlative
    "RP": "OTHER",  # Particle
    "SYM": "OTHER",  # Symbol
    "TO": "PREP",  # _to_
    "UH": "OTHER",  # Interjection
    "VB": "VERB",  # Verb, base form
    "VBD": "VERB",  # Verb, past tense
    "VBG": "VERB",  # Verb, gerund or present participle
    "VBN": "VERB",  # Verb, past participle
    "VBP": "VERB",  # Verb, non-3rd person singular present
    "VBZ": "VERB",  # Verb, 3rd person singular present
    "WDT": "DET",  # Wh-determiner
    "WP": "PRON",  # Wh-pronoun
    "WP$": "PRON",  # Possessive wh-pronoun
    "WRB": "ADV",  # Wh-adverb
    "``": "OTHER",  # Punctuation
    # From the "web treebank" tagset
    "ADD": "OTHER",  # ???
    "AFX": "OTHER",  # Affix
    "GW": "OTHER",  # something like "goes with"???
    "HYPH": "OTHER",  # hyphen???
    "NFP": "OTHER",  # ???
    "XX": "OTHER",  # ???
}


class CoreNLP_EN_Enricher(Enricher):
    _has_lang_chars = re.compile("[A-z]+")

    # override Enricher
    def get_simple_pos(self, token):
        return EN_TB_POS_TO_SIMPLE_POS[token["pos"]]

    # override Enricher
    def needs_enriching(self, token):
        # FIXME: copied from Chinese - review POS and use English ones
        word = lemma(token)
        if "pos" not in token:
            logger.debug("'%s' has no POS so not adding to translatables", word)
            return False

        if token["pos"] in CORENLP_EN_IGNORABLE_POS:
            logger.debug("'%s' has POS '%s' so not adding to translatables", word, token["pos"])
            return False

        # TODO: decide whether to continue removing if doesn't contain any lang-specific chars?
        # Sometimes yes, sometimes no!
        if not self._has_lang_chars.match(word):
            logger.debug(f"Nothing to translate, exiting: {word}")
            return False

        return True

    # override Enricher
    def normalise_punctuation(self, token: AnyToken):
        if "pos" in token and token["pos"] in CORENLP_EN_IGNORABLE_POS:
            token["pos"] = "PU"

    def _cleaned_sentence(self, sentence):
        out_string = ""
        for t in sentence["tokens"]:
            if self.is_clean(t):
                out_string += f' {t["originalText"]}'
        return out_string

    def _get_transliteratable_sentence(self, tokens):
        # FIXME: remove this from Enricher abstract class
        raise NotImplementedError

    def _add_transliterations(self, sentence, transliterator):
        # We don't use/need and online transliterator for English (ok, so maybe it would be better!)

        # FIXME: actually here we should provide a list of alternative pronunciations.
        # Currently the token['pinyin'] field has a list of pinyin for each character in a word
        # that obviously makes no sense for non-character-based languages
        # And it probably shouldn't be called 'pinyin' either :-)
        for t in sentence["tokens"]:
            if not self.needs_enriching(t):
                continue
            # for now we just use the first returned

            t["pinyin"] = [transliterator.transliterate(t["originalText"])]

    def _set_best_guess(
        self, _sentence, token: Token, all_token_definitions: TimestampedDict, phone, available_def_providers: list[str]
    ):
        # TODO: do something intelligent here - sentence isn't used yet
        # ideally this will translate the sentence using some sort of statistical method but get the best
        # translation for each individual word of the sentence, not the whole sentence, giving us the
        # most appropriate definition to show (gloss) to the user

        # This could be bumped to the parent class but for the POS correspondance dicts
        # This is ugly and stupid

        best_guess = None
        others = []
        all_defs = []

        # FIXME: *again* ignoring available_def_providers...
        best_guess = None
        others = []
        all_defs = []

        # TODO: decide whether this is ok
        token_definitions = best_deep_def(token, all_token_definitions).get("defs", [])
        for t in token_definitions.keys():
            if t not in available_def_providers:
                continue
            # FIXME: currently the tokens are stored in keyed order of the "best" source, "fallback" and then the
            # secondary dictionaries. Actually only the "best" currently has any notion of confidence (cf)
            # and all the "fallback" are "OTHER", meaning the "fallback" will only be considered after
            # the secondaries. If anything changes in that, this algo may well not return the "best"
            # translation
            for def_pos, defs in token_definitions[t].items():
                # {ZH_TB_POS_TO_SIMPLE_POS[token['pos']]=}, {ZH_TB_POS_TO_ABC_POS[token['pos']]=} {defs=}")
                if not defs:
                    continue
                all_defs += defs
                if def_pos in (  # pylint: disable=R1723
                    EN_TB_POS_TO_SIMPLE_POS[token["pos"]],
                    EN_TB_POS_TO_ABC_POS[token["pos"]],
                ):
                    # get the most confident for the right POS
                    # TODO: think about integrating the length also, eg
                    # lambda i: abs(IDEAL_GLOSS_STRING_LENGTH-len(i["nt"]))
                    # see the other, fallback methods for more comment on why
                    sorted_defs = sorted(defs, key=lambda i: i["cf"], reverse=True)
                    if len(sorted_defs) > 0:
                        best_guess = sorted_defs[0]
                        break
                elif def_pos == "OTHER":
                    others += defs
            if best_guess:
                break

        if not best_guess and len(others) > 0:
            # it's bad
            logger.debug(
                "No best_guess found for '%s', using the best 'other' POS defs %s",
                lemma(token),
                others,
            )
            # sorted_defs = filter_fake_best_guess(sorted(others, key=lambda i: i["cf"], reverse=True), phone)
            # the "cf" won't really be meaningful anymore, so prefer the ideal gloss string length strings
            # as the cf is not in the rxdb, this is the only method used for calculating the bg in the frontend
            sorted_defs = sorted(others, key=lambda i: abs(IDEAL_GLOSS_STRING_LENGTH - len(i["nt"])))
            if len(sorted_defs) > 0:
                best_guess = sorted_defs[0]

        if not best_guess and len(all_defs) > 0:
            # it's really bad
            # best_guess = sorted(all_defs, key=lambda i: i["cf"], reverse=True)[0]
            # the "cf" won't really be meaningful anymore, so prefer the ideal gloss string length strings
            # as the cf is not in the rxdb, this is the only method used for calculating the bg in the frontend
            best_guess = sorted(all_defs, key=lambda i: abs(IDEAL_GLOSS_STRING_LENGTH - len(i["nt"])))[0]
            logger.debug(
                """No best_guess found with the correct POS or OTHER for '%s',
                using the highest confidence with the wrong POS all_defs %s""",
                lemma(token),
                all_defs,
            )
        logger.debug(
            "Setting best_guess for '%s' POS %s to best_guess %s",
            lemma(token),
            token["pos"],
            best_guess,
        )
        token["bg"] = best_guess

    # override Enricher
    # FIXME: make less complex to get rid of C901
    async def _add_slim_transliterations(  # noqa:C901  # pylint: disable=R0912, R0914
        self, db: AsyncSession, sentence, transliterator: Transliterator
    ):
        # tokens = sentence["t"]
        # ctext = self._get_transliteratable_sentence(tokens)
        # trans = await transliterator.transliterate(db, ctext)
        # # FIXME: remove this from Enricher abstract class
        # clean_trans = " "
        raise NotImplementedError

    # override Enricher
    def _set_slim_best_guess(
        self, sentence, token: Token, all_token_definitions: TimestampedDict, phone, available_def_providers: list[str]
    ):
        self._set_best_guess(sentence, token, all_token_definitions, phone, available_def_providers)
        token["bg"] = token["bg"]["nt"]

    # override Enricher
    def clean_text(self, text: str, remove_whitespace=True) -> str:
        # remove soft hyphens - they are not easily managed in the frontend
        t = text

        t = t.replace("\xc2\xad", "")
        t = t.replace("\xad", "")
        t = t.replace("\u00ad", "")
        t = t.replace("\N{SOFT HYPHEN}", "")
        t = t.replace("\xc2\xa0", " ")
        t = t.replace("\xa0", " ")
        # ??? t = unicodedata.normalize("NFKD", t)

        return t
