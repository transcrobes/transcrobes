# -*- coding: utf-8 -*-
from __future__ import annotations

import logging
import re
import unicodedata as ud

from app.enrich.translate import Translator

logger = logging.getLogger(__name__)


class ZHHANS_EN_Translator(Translator):
    # See https://dkpro.github.io/dkpro-core/releases/1.9.0/docs/tagset-reference.html
    # for a complete list of papers that have POS for various languages!

    # the CoreNLP POS tags are from the Penn Chinese Treebank project, see
    # and http://www.cs.brandeis.edu/~clp/ctb/posguide.3rd.ch.pdf

    # Here taken from that paper's table of contents
    # Verb: VA, VC, VE, VV
    # 2.1.1 Predicative adjective: VA
    # 2.1.2 Copula: VC
    # 2.1.3 you3 as the main verb: VE
    # 2.1.4 Other verb: VV
    #
    # 2.2 Noun: NR, NT, NN
    # 2.2.1 Proper Noun: NR
    # 2.2.2 Temporal Noun: NT
    # 2.2.3 Other Noun: NN
    #
    # 2.3 Localizer: LC
    #
    # 2.4 Pronoun: PN
    #
    # 2.5 Determiners and numbers: DT, CD, OD
    # 2.5.1 Determiner: DT
    # 2.5.2 Cardinal Number: CD
    # 2.5.3 Ordinal Number: OD
    #
    # 2.6 Measure word: M
    #
    # 2.7 Adverb: AD
    #
    # 2.8 Preposition: P
    #
    # 2.9 Conjunctions: CC, CS
    # 2.9.1 Coordinating conjunction: CC
    # 2.9.2 Subordinating conjunction: CS
    #
    # 2.10 Particle: DEC, DEG, DER, DEV, AS, SP, ETC, MSP
    # 2.10.1 de5 as a complementizer or a nominalizer: DEC
    # 2.10.2 de5 as a genitive marker and an associative marker: DEG
    # 2.10.3 Resultative de5: DER
    # 2.10.4 Manner de5: DEV
    # 2.10.5 Aspect Particle: AS
    # 2.10.6 Sentence-final particle: SP
    # 2.10.7 ETC
    # 2.10.8 Other particle: MSP
    #
    # 2.11 Others: IJ, ON, LB, SB, BA, JJ, FW, PU
    # 2.11.1 Interjection: IJ
    # 2.11.2 Onomatopoeia: ON
    # 2.11.3 bei4 in long bei-construction: LB
    # 2.11.4 bei4 in short bei-construction: SB
    # 2.11.5 ba3 in ba-construction: BA
    # 2.11.6 other noun-modifier: JJ
    # 2.11.7 Foreign Word: FW
    # 2.11.8 Punctuation: PU

    # Simple POS, taken from Bing
    # Tag name  Description
    # ADJ   Adjectives
    # ADV   Adverbs
    # CONJ  Conjunctions
    # DET   Determiners
    # MODAL Verbs
    # NOUN  Nouns
    # PREP  Prepositions
    # PRON  Pronouns
    # VERB  Verbs
    # OTHER Other

    pass


PinyinToneMark = {
    0: "aoeiuv\u00fc",
    1: "\u0101\u014d\u0113\u012b\u016b\u01d6\u01d6",
    2: "\u00e1\u00f3\u00e9\u00ed\u00fa\u01d8\u01d8",
    3: "\u01ce\u01d2\u011b\u01d0\u01d4\u01da\u01da",
    4: "\u00e0\u00f2\u00e8\u00ec\u00f9\u01dc\u01dc",
}
pins = (
    "/aoeiuv\u00fc\u0101\u014d\u0113\u012b\u016b\u01d6\u01d6\u00e1\u00f3\u00e9\u00ed\u00fa\u01d8\u01d8\u01ce\u01d2"
    "\u011b\u01d0\u01d4\u01da\u01da\u00e0\u00f2\u00e8\u00ec\u00f9\u01dc\u01dc"
)

# super, sub and mid script unicode numbers
supersubs = re.compile(r"[\u00b2\u00b3\u00b9\u2070-\u2099]+", re.UNICODE)


# FIXME: this needs to be thoroughly tested and refactored to be beautiful
def decode_phone(s: str) -> str:  # pylint: disable=R0912  # noqa:C901
    """
    Convert to a standard pinyin form
    parameter: s = sound
    """

    """
    Remove super, mid and subscript numbers. Present in the ABC Dict
    """
    s = supersubs.sub("", s)

    """
    Remove the "DOT BELOW" and "LINE BELOW". Present in the ABC Dict
    - see tone-change-notation.u8 in their repo for details

    NFKD considers graphs like ọ̌ to be 3 characters - ['o', '̣', '̌']
        and 'ǒ' to be 2 characters - ['o', '̌']
    NFC considers graphs like ọ̌ to be 2 characters - ['ọ', '̌']
        and 'ǒ' to be 1 character - ['ǒ']
    By converting to NFKD we can isolate the BELOW characters and remove them
    By converting back to NFC, we combine back to get a single char per graph
    """
    s = ud.normalize("NFC", ud.normalize("NFKD", s).replace("̣", "").replace("̠", ""))

    # lowercase because we consider pinyin to be a phonetic representation of a string
    # of Chinese characters, not an alternative writing system (that uses caps for proper nouns)
    s = s.lower()
    r = ""
    t = ""
    for c in s:  # pylint: disable=R1702
        if ("a" <= c <= "z") or c in pins:
            t += c
        elif c == ":":
            assert t[-1] == "u"
            t = t[:-1] + "\u00fc"
        else:
            if "0" <= c <= "5":
                tone = int(c) % 5
                if tone != 0:
                    m = re.search("[aoeiuv\u00fc]+", t)
                    if m is None:
                        t += c
                    elif len(m.group(0)) == 1:
                        t = (
                            t[: m.start(0)]
                            + PinyinToneMark[tone][PinyinToneMark[0].index(m.group(0))]
                            + t[m.end(0) :]  # noqa: E203
                        )
                    else:
                        if "a" in t:
                            t = t.replace("a", PinyinToneMark[tone][0])
                        elif "o" in t:
                            t = t.replace("o", PinyinToneMark[tone][1])
                        elif "e" in t:
                            t = t.replace("e", PinyinToneMark[tone][2])
                        elif t.endswith("ui"):
                            t = t.replace("i", PinyinToneMark[tone][3])
                        elif t.endswith("iu"):
                            t = t.replace("u", PinyinToneMark[tone][4])
                        else:
                            t += "!"
            r += t
            t = ""
    r += t
    return r
