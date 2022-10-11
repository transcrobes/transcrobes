# -*- coding: utf-8 -*-
import logging
import os
import re
from collections import defaultdict

from app.enrich.data import PersistenceProvider
from app.enrich.transliterate import Transliterator
from app.models.lookups import EnCMULookup
from sqlalchemy.ext.asyncio.session import AsyncSession

logger = logging.getLogger(__name__)

"""
IMPORTANT NOTE:
    All of the CMU-specific logic and code was ENTIRELY taken from
    https://github.com/mphilli/English-to-IPA, with the exception of a few tweaks
    That code is licenced under the MIT licence, see
    https://github.com/mphilli/English-to-IPA/blob/26d1f51d5d40c9df0edd2afe03d698fa402115ed/LICENSE
"""

# taken from cmu-dict-0.7b.phones.txt with lower()
# noqa E203
CMU_PHONES = {
    "aa": "vowel",
    "ae": "vowel",
    "ah": "vowel",
    "ao": "vowel",
    "aw": "vowel",
    "ay": "vowel",
    "b": "stop",
    "ch": "affricate",
    "d": "stop",
    "dh": "fricative",
    "eh": "vowel",
    "er": "vowel",
    "ey": "vowel",
    "f": "fricative",
    "g": "stop",
    "hh": "aspirate",
    "ih": "vowel",
    "iy": "vowel",
    "jh": "affricate",
    "k": "stop",
    "l": "liquid",
    "m": "nasal",
    "n": "nasal",
    "ng": "nasal",
    "ow": "vowel",
    "oy": "vowel",
    "p": "stop",
    "r": "liquid",
    "s": "fricative",
    "sh": "fricative",
    "t": "stop",
    "th": "fricative",
    "uh": "vowel",
    "uw": "vowel",
    "v": "fricative",
    "w": "semivowel",
    "y": "semivowel",
    "z": "fricative",
    "zh": "fricative",
}

"""
Orignal in Eng_to_IPA
IPA_SYMBOLS = {"a": "ə", "ey": "e", "aa": "ɑ", "ae": "æ", "ah": "ə", "ao": "ɔ",
           "aw": "aʊ", "ay": "aɪ", "ch": "ʧ", "dh": "ð", "eh": "ɛ", "er": "ər",
           "hh": "h", "ih": "ɪ", "jh": "ʤ", "ng": "ŋ",  "ow": "oʊ", "oy": "ɔɪ",
           "sh": "ʃ", "th": "θ", "uh": "ʊ", "uw": "u", "zh": "ʒ", "iy": "i", "y": "j"}
"""
# This taken from https://en.wikipedia.org/wiki/ARPABET
IPA_SYMBOLS = {
    "a": "ə",  # TODO: this was in Eng_to_IPA but only in the single char version on ARPABET
    "aa": "ɑ",  # balm, bot
    "ae": "æ",  # bat
    "ah": "ʌ",  # butt
    "ao": "ɔ",  # story
    "aw": "aʊ",  # bout
    "ax": "ə",  # comma
    "axr": "ɚ",  # letter
    "ay": "aɪ",  # bite
    "eh": "ɛ",  # bet
    "er": "ɝ",  # bird
    "ey": "eɪ",  # bait
    "ih": "ɪ",  # bit
    "ix": "ɨ",  # roses, rabbit
    "iy": "i",  # beat
    "ow": "oʊ",  # boat
    "oy": "ɔɪ",  # boy
    "uh": "ʊ",  # book
    "uw": "u",  # boot
    "ux": "ʉ",  # dude
    "b": "b",  # buy
    "ch": "tʃ",  # China
    "d": "d",  # die
    "dh": "ð",  # thy
    "dx": "ɾ",  # butter
    "el": "l̩",  # bottle
    "em": "m̩",  # rhythm
    "en": "n̩",  # button
    "f": "f",  # fight
    "g": "ɡ",  # guy
    "hh": "h",  # high
    "h": "h",  # high
    "jh": "dʒ",  # jive
    "k": "k",  # kite
    "l": "l",  # lie
    "m": "m",  # my
    "n": "n",  # nigh
    "ng": "ŋ",  # sing
    "nx": "ɾ̃",  # winner
    "p": "p",  # pie
    "q": "ʔ",  # uh-oh
    "r": "ɹ",  # rye
    "s": "s",  # sigh
    "sh": "ʃ",  # shy
    "t": "t",  # tie
    "th": "θ",  # thigh
    "v": "v",  # vie
    "w": "w",  # wise
    "wh": "ʍ",  # why
    "y": "j",  # yacht
    "z": "z",  # zoo
    "zh": "ʒ",  # pleasure
}


HIATUS = [["er", "iy"], ["iy", "ow"], ["uw", "ow"], ["iy", "ah"], ["iy", "ey"], ["uw", "eh"], ["er", "eh"]]


class CMU_EN_Transliterator(PersistenceProvider, Transliterator):
    """
    from enrichers.en.transliterate.cmu import CMU_EN_Transliterator;
    toto = CMU_EN_Transliterator({'path': '/opt/transcrobes/cmudict-0.7b.txt', 'inmem': True})
    """

    model_type = EnCMULookup

    def __init__(self, config):
        super().__init__(config)

    # override PersistenceProvider
    def _load(self):
        logger.info("Starting population of CMU dict")
        dico = defaultdict(list)

        if os.path.exists(self._config["path"]):
            with open(self._config["path"], "r") as data_file:
                for line in data_file:
                    word = re.sub(r"\(\d\)", "", line.split("  ")[0]).lower()
                    phonemes = line.split("  ")[1].replace("\n", "").lower()

                    dico[word].append(self._cmu_to_ipa([[phonemes]])[0][0])

            # TODO: the code from English_to_IPA appears to not distinguish between
            # CMU stressed and unstressed for certain words, an example being
            # CMU 'b iy1' and 'b iy0'. I guess this makes sense... but why did
            # CMU put it in then? Find out!
            # eng_to_ipa thus returns duplicates, so here we remove duplicates
            for k, v in dico.items():
                dico[k] = sorted(list(set(v)))

        logger.info("Finished population of CMU dict")

        return dico

    def _cmu_to_ipa(self, cmu_list, mark=True, stress_marking="all"):  # noqa C901
        """converts the CMU word lists into IPA transcriptions"""
        ipa_list = []  # the final list of IPA tokens to be returned
        for word_list in cmu_list:
            ipa_word_list = []  # the word list for each word
            for word in word_list:
                if stress_marking:
                    word = self._find_stress(word, stype=stress_marking)
                else:
                    if re.sub(r"\d*", "", word.replace("__IGNORE__", "")) == "":
                        pass  # do not delete token if it's all numbers
                    else:
                        word = re.sub("[0-9]", "", word)
                ipa_form = ""
                if word.startswith("__IGNORE__"):
                    ipa_form = word.replace("__IGNORE__", "")

                    # mark words we couldn't transliterate with an asterisk:
                    if mark:
                        if not re.sub(r"\d*", "", ipa_form) == "":
                            ipa_form += "*"
                else:
                    for piece in word.split(" "):
                        marked = False
                        unmarked = piece
                        if piece[0] in ["ˈ", "ˌ"]:
                            marked = True
                            mark = piece[0]
                            unmarked = piece[1:]
                        if unmarked in IPA_SYMBOLS:
                            if marked:
                                ipa_form += mark + IPA_SYMBOLS[unmarked]
                            else:
                                ipa_form += IPA_SYMBOLS[unmarked]

                        else:
                            ipa_form += piece
                SWAP_LIST = [["ˈər", "əˈr"], ["ˈie", "iˈe"]]
                for sym in SWAP_LIST:
                    if not ipa_form.startswith(sym[0]):
                        ipa_form = ipa_form.replace(sym[0], sym[1])
                ipa_word_list.append(ipa_form)
            ipa_list.append(sorted(list(set(ipa_word_list))))
        return ipa_list

    def _stress_type(self, stress):
        return {"1": "ˈ", "2": "ˌ"}

    def _cmu_syllable_count(self, word):
        """count syllables based on CMU transcription"""
        word = re.sub(r"\d", "", word).split(" ")
        if "__IGNORE__" in word[0]:
            return 0
        else:
            nuclei = 0
            for i, sym in enumerate(word):
                prev_phone = CMU_PHONES[word[i - 1]]
                prev_sym = word[i - 1]
                if CMU_PHONES[sym] == "vowel":
                    if i > 0 and not prev_phone == "vowel" or i == 0:
                        nuclei += 1
                    elif [prev_sym, sym] in HIATUS:
                        nuclei += 1
            return nuclei

    def _find_stress(self, word, stype="all"):  # noqa C901
        """Convert stress marking numbers from CMU into actual stress markings
        :param word: the CMU word string to be evaluated for stress markings
        :param stype: type of stress to be evaluated (primary, secondary, or both)"""

        syll_count = self._cmu_syllable_count(word)

        if (not word.startswith("__IGNORE__")) and syll_count > 1:
            symbols = word.split(" ")
            stress_map = self._stress_type(stype)
            new_word = []
            CLUSTERS = ["sp", "st", "sk", "fr", "fl"]
            STOP_SET = ["nasal", "fricative", "vowel"]  # stop searching where stress starts if these are encountered
            # for each CMU symbol
            for c in symbols:
                # if the last character is a 1 or 2 (that means it has stress, and we want to evaluate it)
                if c[-1] in stress_map.keys():
                    # if the new_word list is empty
                    if not new_word:
                        # append to new_word the CMU symbol, replacing numbers with stress marks
                        new_word.append(re.sub(r"\d", "", stress_map[re.findall(r"\d", c)[0]] + c))
                    else:
                        stress_mark = stress_map[c[-1]]
                        placed = False
                        hiatus = False
                        new_word = new_word[::-1]  # flip the word and backtrack through symbols
                        for i, sym in enumerate(new_word):
                            sym = re.sub("[0-9ˈˌ]", "", sym)
                            prev_sym = re.sub("[0-9ˈˌ]", "", new_word[i - 1])
                            prev_phone = CMU_PHONES[re.sub("[0-9ˈˌ]", "", new_word[i - 1])]
                            if (
                                CMU_PHONES[sym] in STOP_SET
                                or (i > 0 and prev_phone == "stop")
                                or sym in ["er", "w", "j"]
                            ):
                                if sym + prev_sym in CLUSTERS:
                                    new_word[i] = stress_mark + new_word[i]
                                elif not prev_phone == "vowel" and i > 0:
                                    new_word[i - 1] = stress_mark + new_word[i - 1]
                                else:
                                    if CMU_PHONES[sym] == "vowel":
                                        hiatus = True
                                        new_word = [stress_mark + re.sub("[0-9ˈˌ]", "", c)] + new_word
                                    else:
                                        new_word[i] = stress_mark + new_word[i]
                                placed = True
                                break
                        if not placed:
                            if new_word:
                                new_word[len(new_word) - 1] = stress_mark + new_word[len(new_word) - 1]
                        new_word = new_word[::-1]
                        if not hiatus:
                            new_word.append(re.sub(r"\d", "", c))
                            hiatus = False
                else:
                    if c.startswith("__IGNORE__"):
                        new_word.append(c)
                    else:
                        new_word.append(re.sub(r"\d", "", c))

            return " ".join(new_word)
        else:
            if word.startswith("__IGNORE__"):
                return word
            else:
                return re.sub("[0-9]", "", word)

    # override Transliterator
    async def transliterate(self, db: AsyncSession, text):
        # TODO: everything is uppercase in the original CMU file but lowercased inmem and
        # the DB here
        return " ".join(["/".join(await self.entry(db, t.lower()) or [f"{t}*"]) for t in text.split()])

    # override Transliterator
    @staticmethod
    def name():
        return CMU_EN_Transliterator.model_type.SHORT_NAME
