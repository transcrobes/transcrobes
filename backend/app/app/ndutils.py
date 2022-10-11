# -*- coding: utf-8 -*-
from __future__ import annotations

import asyncio
import base64
import json
from typing import TYPE_CHECKING

from app.etypes import LANG_PAIR_SEPARATOR, AnyToken, PosDefinition, SlimPosDefinition
from app.unicode_ranges import (
    CJK_RADICALS_SUPPLEMENT_UTF8_ORD_MAX,
    CJK_RADICALS_SUPPLEMENT_UTF8_ORD_MIN,
    EXTENDED_ENGLISH_CHARS_ONLY_RE,
    EXTENDED_ENGLISH_CHARS_RE,
    KANGXI_RADICALS_UTF8_ORD_MAX,
    KANGXI_RADICALS_UTF8_ORD_MIN,
    SIMPLIFIED_UTF8_ORD_MAX,
    SIMPLIFIED_UTF8_ORD_MIN,
    ZHHANS_CHARS_RE,
)

if TYPE_CHECKING:
    from app.models.mixins import TimestampMixin


EN_MAX_ALLOWED_CHARACTERS = 47
ZH_MAX_ALLOWED_CHARACTERS = 10


def get_from_lang(lang_pair: str) -> str:
    return lang_pair.split(LANG_PAIR_SEPARATOR)[0]


def get_to_lang(lang_pair: str) -> str:
    return lang_pair.split(LANG_PAIR_SEPARATOR)[1]


def to_import(word: str, from_lang: str) -> bool:
    # WARNING! This is a very naive implementation, but it works for now
    # At the moment we consider that English words MUST have ONLY english characters
    # but that Chinese words can have any character, including english ones, as long as they have at
    # least one Chinese character
    if from_lang == "en":
        # Here we assume that English can have French, but not German. Well I am a French citizen... :-)
        return bool(EXTENDED_ENGLISH_CHARS_ONLY_RE.search(word))
    # FIXME: replace with https://github.com/tsroten/hanzidentifier or https://github.com/tsroten/zhon
    elif from_lang == "zh-Hans":
        return bool(ZHHANS_CHARS_RE.search(word))
    return False


def within_char_limit(word: str, from_lang: str) -> bool:
    if from_lang == "zh-Hans":
        return len(word) <= ZH_MAX_ALLOWED_CHARACTERS
    return len(word) <= EN_MAX_ALLOWED_CHARACTERS


def to_enrich(word: str, from_lang: str) -> bool:
    if from_lang == "en":
        # Here we assume that English can have French, but not German. Well I am a French citizen... :-)
        return bool(EXTENDED_ENGLISH_CHARS_RE.search(word))
    # FIXME: replace with https://github.com/tsroten/hanzidentifier or https://github.com/tsroten/zhon
    elif from_lang == "zh-Hans":
        return bool(ZHHANS_CHARS_RE.search(word))
    return False


def is_useful_character(char: str, from_lang: str = "zh-Hans") -> bool:
    if from_lang == "en":
        return ord("A") <= ord(char) <= ord("Z") or ord("a") <= ord(char) <= ord("z")
    return (
        (ord(char) >= SIMPLIFIED_UTF8_ORD_MIN and ord(char) <= SIMPLIFIED_UTF8_ORD_MAX)
        or (ord(char) >= KANGXI_RADICALS_UTF8_ORD_MIN and ord(char) <= KANGXI_RADICALS_UTF8_ORD_MAX)
        or (ord(char) >= CJK_RADICALS_SUPPLEMENT_UTF8_ORD_MIN and ord(char) <= CJK_RADICALS_SUPPLEMENT_UTF8_ORD_MAX)
    )


# stolen from django.contrib.admin.utils...
def flatten(fields):
    """
    Return a list which is a single level of flattening of the original list.
    """
    flat = []
    for field in fields:
        if isinstance(field, (list, tuple)):
            flat.extend(field)
        else:
            flat.append(field)
    return flat


def user_imports_path(instance: TimestampMixin, filename: str):
    # WARNING! Only useful in a modiles.FileField
    # file uploads for imports will be uploaded to MEDIA_ROOT/user_<id>/imports/<filename>
    return f"user_{instance.created_by.id}/imports/{filename}"


def lemma(token: AnyToken) -> str:
    return token.get("l") or token["lemma"]


def orig_text(token: AnyToken) -> str:
    return token.get("w") or token.get("word") or token.get("originalText") or lemma(token)


def phone_rep(token: AnyToken) -> str:
    return token.get("p") or token["pinyin"]


def clean_definitions(definitions):
    for k in definitions.keys():
        for definition in definitions[k]:
            clean_standardised(definition)
    return definitions


def clean_standardised(definition: PosDefinition) -> SlimPosDefinition:
    # FIXME: inplace clean and return - this is plain nasty, but very performant - need to do better
    definition["nt"] = definition["normalizedTarget"]
    definition["cf"] = definition["confidence"]
    # definition["p"] = definition["pinyin"]
    for key in ["confidence", "opos", "pinyin", "normalizedTarget", "trans_provider"]:
        try:
            del definition[key]
        except KeyError:
            pass
    return definition


def get_username_lang_pair(request):
    # FIXME: obsolete???
    auth_header = request.META.get("HTTP_AUTHORIZATION")
    scheme, token = auth_header.split(" ") if auth_header else "", ""
    if scheme == "Bearer":
        encoded_payload = token.split(".")[1]  # isolates payload
        encoded_payload += "=" * ((4 - len(encoded_payload) % 4) % 4)  # properly pad
        payload = json.loads(base64.b64decode(encoded_payload).decode("utf-8"))
        return payload["username"], payload["lang_pair"]

    # it must be basic, meaning we have already auth'ed with the DB
    return request.user.username, request.user.lang_pair


async def gather_with_concurrency(n, *tasks):
    semaphore = asyncio.Semaphore(n)

    async def sem_task(task):
        async with semaphore:
            return await task

    return await asyncio.gather(*(sem_task(task) for task in tasks))
