# -*- coding: utf-8 -*-
from __future__ import annotations

import collections
import logging
import unicodedata
from typing import List

import opencc
import unidecode
from app.cache import TimestampedDict
from app.enrich import Enricher, TransliterationException, best_deep_def
from app.enrich.models import Token
from app.enrich.transliterate import Transliterator
from app.etypes import AnyToken, Sentence
from app.ndutils import ZHHANS_CHARS_RE, lemma
from app.zhhans_en.translate.abc import ZH_TB_POS_TO_ABC_POS
from sqlalchemy.ext.asyncio.session import AsyncSession

logger = logging.getLogger(__name__)


"""
This file contains the conversion tables between CoreNLP POS tags (taken from the
Penn Chinese Treebank) and the various supported dictionaries for zh-Hans
"""


"""
see http://www.cs.brandeis.edu/~clp/ctb/posguide.3rd.ch.pdf
for more info on the Penn Chinese Treebank tagset

Here taken from that paper's table of contents
Verb: VA, VC, VE, VV
2.1.1 Predicative adjective: VA
2.1.2 Copula: VC
2.1.3 you3 as the main verb: VE
2.1.4 Other verb: VV

2.2 Noun: NR, NT, NN
2.2.1 Proper Noun: NR
2.2.2 Temporal Noun: NT
2.2.3 Other Noun: NN

2.3 Localizer: LC

2.4 Pronoun: PN

2.5 Determiners and numbers: DT, CD, OD
2.5.1 Determiner: DT
2.5.2 Cardinal Number: CD
2.5.3 Ordinal Number: OD

2.6 Measure word: M

2.7 Adverb: AD

2.8 Preposition: P

2.9 Conjunctions: CC, CS
2.9.1 Coordinating conjunction: CC
2.9.2 Subordinating conjunction: CS

2.10 Particle: DEC, DEG, DER, DEV, AS, SP, ETC, MSP
2.10.1 de5 as a complementizer or a nominalizer: DEC
2.10.2 de5 as a genitive marker and an associative marker: DEG
2.10.3 Resultative de5: DER
2.10.4 Manner de5: DEV
2.10.5 Aspect Particle: AS
2.10.6 Sentence-final particle: SP
2.10.7 ETC
2.10.8 Other particle: MSP

2.11 Others: IJ, ON, LB, SB, BA, JJ, FW, PU
2.11.1 Interjection: IJ
2.11.2 Onomatopoeia: ON
2.11.3 bei4 in long bei-construction: LB
2.11.4 bei4 in short bei-construction: SB
2.11.5 ba3 in ba-construction: BA
2.11.6 other noun-modifier: JJ
2.11.7 Foreign Word: FW
2.11.8 Punctuation: PU
"""

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

# TODO: This was a little arbitrary...
# Chinese Penn Treebank to Bing
ZH_TB_POS_TO_SIMPLE_POS = {
    "AD": "ADV",  # adverb
    "AS": "OTHER",  # aspect marker
    "BA": "OTHER",  # in ba-construction ,
    "CC": "CONJ",  # coordinating conjunction
    "CD": "DET",  # cardinal number
    "CS": "CONJ",  # subordinating conjunction
    "DEC": "OTHER",  # in a relative-clause
    "DEG": "OTHER",  # associative
    "DER": "OTHER",  # in V-de const. and V-de-R
    "DEV": "OTHER",  # before VP
    "DT": "DET",  # determiner
    "ETC": "OTHER",  # for words , ,
    "FW": "OTHER",  # foreign words
    "IJ": "OTHER",  # interjection
    "JJ": "ADJ",  # other noun-modifier ,
    "LB": "OTHER",  # in long bei-const ,
    "LC": "OTHER",  # localizer
    "M": "OTHER",  # measure word
    "MSP": "OTHER",  # other particle
    "NN": "NOUN",  # common noun
    "NR": "NOUN",  # proper noun
    "NT": "NOUN",  # temporal noun
    "OD": "DET",  # ordinal number
    "ON": "OTHER",  # onomatopoeia ,
    "P": "PREP",  # preposition excl. and
    "PN": "PRON",  # pronoun
    "PU": "OTHER",  # punctuation
    "SB": "OTHER",  # in short bei-const ,
    "SP": "OTHER",  # sentence-final particle
    "VA": "ADJ",  # predicative adjective
    "VC": "VERB",
    "VE": "VERB",  # as the main verb
    "VV": "VERB",  # other verb
    # Others added since then
    "URL": "OTHER",
}

CORENLP_ZH_IGNORABLE_POS = {"PU", "OD", "CD", "NT", "URL", "FW"}
CORENLP_ZH_IGNORABLE_POS_SHORT = {"PU", "URL"}

IDEAL_GLOSS_STRING_LENGTH = 5  # pretty random but https://arxiv.org/pdf/1208.6109.pdf


def filter_fake_best_guess(entries, phone):
    filtered = []
    # we DON'T do a entry.lower() because we DO want proper names, but proper names should always
    # be capitalised, so Xi Jingping, Huawei, etc. should be Ok (ie, not filtered).
    for entry in entries:
        local_phone = unidecode.unidecode("".join((entry.get("p") or phone).split())).lower()
        if local_phone != "".join(entry["nt"].split()):
            filtered.append(entry)
    return filtered


class CoreNLP_ZHHANS_Enricher(Enricher):
    def __init__(self, config):
        super().__init__(config)
        self.converter = opencc.OpenCC("t2s.json")

    @staticmethod
    def get_simple_pos(token):
        return ZH_TB_POS_TO_SIMPLE_POS[token["pos"]]

    @staticmethod
    def needs_enriching(token):
        word = lemma(token)
        if "pos" not in token:
            logger.debug("'%s' has no POS so not adding to translatables", word)
            return False
        # FIXME: this was previously the following, trying to change and see whether it's bad...
        # if token['pos'] in CORENLP_IGNORABLE_POS:
        if token["pos"] in CORENLP_ZH_IGNORABLE_POS_SHORT:
            logger.debug("'%s' has POS '%s' so not adding to translatables", word, token["pos"])
            return False

        # TODO: decide whether to continue removing if doesn't contain any Chinese chars?
        # Sometimes yes, sometimes no!
        if not ZHHANS_CHARS_RE.match(word):
            logger.debug("Nothing to translate, exiting: %s", word)
            return False

        return True

    # override Enricher
    def normalise_punctuation(self, token: AnyToken):
        # Nothing to do for ZH
        pass

    # override Enricher
    def _cleaned_sentence(self, sentence: Sentence) -> str:
        out_string = ""
        for t in sentence["tokens"]:
            if self.is_clean(t):
                out_string += f'{t["originalText"]}'

        return out_string

    @staticmethod
    def _get_transliteratable_sentence(tokens: List[AnyToken]) -> str:
        t_sent = ""
        for t in tokens:
            w = t.get("ot") or t.get("l") or t.get("originalText") or t.get("lemma")
            t_sent += w if ZHHANS_CHARS_RE.match(w) else f" {w}"
        return t_sent

    # override Enricher
    # FIXME: make less complex to get rid of C901
    # FIXME: PROBABLY TO DELETE
    async def _add_transliterations(  # noqa:C901  # pylint: disable=R0912
        self, db: AsyncSession, sentence: Sentence, transliterator: Transliterator
    ) -> bool:
        tokens = sentence["tokens"]
        ctext = self._get_transliteratable_sentence(tokens)
        trans = await transliterator.transliterate(db, ctext)

        clean_trans = " "

        i = 0
        while i < len(trans):
            if not unicodedata.category(trans[i]).startswith("L") or not unicodedata.category(trans[i - 1]).startswith(
                "L"
            ):
                clean_trans += " "
            clean_trans += trans[i]
            i += 1

        # ensure we have one and only one space between all word tokens
        clean_trans = " ".join(list(filter(None, clean_trans.split(" "))))

        deq = collections.deque(clean_trans.split(" "))
        try:
            for t in tokens:
                w = t["originalText"]
                pinyin = []
                i = 0
                nc = ""

                # originally
                # if w == '…':  # TODO: pure nastiness - this gets translit'ed as '...'
                #     t['phone'] = deq.popleft() + deq.popleft() + deq.popleft()
                #     continue
                if not w.replace("…", ""):  # only contains the ...
                    t["phone"] = deq.popleft()
                    while deq and deq[0] == ".":
                        t["phone"] += deq.popleft()
                    continue

                while i < len(w):
                    if unicodedata.category(w[i]) == "Lo":  # it's a Chinese char  # it's a Chinese char
                        pinyin.append(deq.popleft())
                    else:
                        if not nc:
                            nc = deq.popleft()
                        if w[i] != nc[0]:
                            logger.error(f"{w[i]} should equal {nc} for '{clean_trans}'")
                            raise TransliterationException(
                                f"{w[i]} should equal {nc} for '{clean_trans}' "
                                f"and tokens '{tokens}' with original {ctext}"
                            )
                        pinyin.append(w[i])
                        if len(nc) > 1:
                            nc = nc[1:]
                        else:
                            nc = ""
                    i += 1
                t["phone"] = pinyin
            return True
        except Exception:  # pylint: disable=W0703
            logger.error(
                f"Error calculating context-informed pinyin, trying from tokens '{tokens}' with original {ctext}"
            )
            for token in tokens:
                token["phone"] = (await transliterator.transliterate(db, token["originalText"])).split()
            return False

    # override Enricher
    # FIXME: make less complex to get rid of C901
    async def _add_slim_transliterations(  # noqa:C901  # pylint: disable=R0912, R0914
        self, db: AsyncSession, sentence, transliterator: Transliterator
    ):
        tokens = sentence["t"]
        ctext = self._get_transliteratable_sentence(tokens)
        trans = await transliterator.transliterate(db, ctext)

        clean_trans = " "

        i = 0
        while i < len(trans):
            if not unicodedata.category(trans[i]).startswith("L") or not unicodedata.category(trans[i - 1]).startswith(
                "L"
            ):
                clean_trans += " "
            clean_trans += trans[i]
            i += 1

        # ensure we have one and only one space between all word tokens
        clean_trans = " ".join(list(filter(None, clean_trans.split(" "))))

        deq = collections.deque(clean_trans.split(" "))
        try:
            for t in tokens:
                w = t.get("ot") or t.get("l") or t.get("originalText") or t.get("lemma")
                pinyin = []
                i = 0
                nc = ""

                # originally
                # if w == '…':  # TODO: pure nastiness - this gets translit'ed as '...'
                #     t['phone'] = deq.popleft() + deq.popleft() + deq.popleft()
                #     continue
                if not w.replace("…", ""):  # only contains the ...
                    t["p"] = deq.popleft()
                    while deq and deq[0] == ".":
                        t["p"] += deq.popleft()
                    continue

                while i < len(w):
                    if unicodedata.category(w[i]) == "Lo":  # it's a Chinese char  # it's a Chinese char
                        pinyin.append(deq.popleft())
                    else:
                        if not nc:
                            nc = deq.popleft()
                        if w[i] != nc[0]:
                            logger.error(f"{w[i]} should equal {nc} for '{clean_trans}'")
                            raise TransliterationException(
                                f"{w[i]} should equal {nc} for '{clean_trans}' "
                                f"and tokens '{tokens}' with original {ctext}"
                            )
                        pinyin.append(w[i])
                        if len(nc) > 1:
                            nc = nc[1:]
                        else:
                            nc = ""
                    i += 1
                t["p"] = pinyin

            for token in tokens:
                if not self.is_clean(token) or not self.needs_enriching(token):
                    token.pop("p")

            return True
        except Exception:  # pylint: disable=W0703
            logger.error(
                f"Error calculating context-informed pinyin, trying from tokens '{tokens}' with original {ctext}"
            )
            for token in tokens:
                if not self.is_clean(token) or not self.needs_enriching(token):
                    continue
                word = token.get("ot") or token.get("l") or token.get("originalText") or token["lemma"]
                token["p"] = (await transliterator.transliterate(db, word)).split()
            return False

    # override Enricher
    def _set_best_guess(
        self, _sentence, token: Token, all_token_definitions: TimestampedDict, phone, available_def_providers: list[str]
    ):
        # TODO: do something intelligent here - sentence isn't used yet
        # ideally this will translate the sentence using some sort of statistical method but get the best
        # translation for each individual word of the sentence, not the whole sentence, giving us the
        # most appropriate definition to show (gloss) to the user

        # This could be bumped to the parent class but for the POS correspondance dicts
        # This is ugly and stupid

        # FIXME: *again* ignoring available_def_providers...
        best_guess = None
        others = []
        all_defs = []

        # TODO: decide whether this is ok
        token_definitions = best_deep_def(token, all_token_definitions).get("defs", {})

        # BEFORE THERE WAS THIS
        # FIXME: currently the tokens are stored in keyed order of the "best" source, "fallback" and then the
        # secondary dictionaries. Actually only the "best" currently has any notion of confidence (cf)
        # and all the "fallback" are "OTHER", meaning the "fallback" will only be considered after
        # the secondaries. If anything changes in that, this algo may well not return the "best"
        # translation

        # NOW I AM REORDERING SO fbk IS LAST - the other dictionaries probably have better definitions and also don't have POS, so
        # they won't get used before the fbk ones. They probably should be? Maybe?
        tmp = token_definitions.pop("fbk", None)
        if tmp:
            token_definitions["fbk"] = tmp

        for t in token_definitions.keys():
            if t not in available_def_providers:
                continue
            for def_pos, defs in token_definitions[t].items():
                if not defs:
                    continue
                all_defs += defs
                if def_pos in (  # pylint: disable=R1723
                    ZH_TB_POS_TO_SIMPLE_POS[token["pos"]],
                    ZH_TB_POS_TO_ABC_POS[token["pos"]],
                ):
                    # get the most confident for the right POS
                    # TODO: think about integrating the length also, eg
                    # lambda i: abs(IDEAL_GLOSS_STRING_LENGTH-len(i["nt"]))
                    # see the other, fallback methods for more comment on why
                    sorted_defs = filter_fake_best_guess(sorted(defs, key=lambda i: i["cf"], reverse=True), phone)
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
            sorted_defs = filter_fake_best_guess(
                sorted(others, key=lambda i: abs(IDEAL_GLOSS_STRING_LENGTH - len(i["nt"]))), phone
            )
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
        # remove the left-to-right mark - in theory we should support this but it's too hard for little benefit at this stage
        t = t.replace("&#8206;", " ")
        t = t.replace("&lrm;", " ")
        # ??? t = unicodedata.normalize("NFKD", t)

        if remove_whitespace:
            t = "".join(t.split())  # for Chinese we can/should remove any spaces
        # Make sure it is simplified and clean, so we don't pollute the DB
        return self.converter.convert(t)
