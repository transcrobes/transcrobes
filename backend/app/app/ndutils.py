# -*- coding: utf-8 -*-
from __future__ import annotations

import asyncio
import base64

# import orjson as json
import json
import re
from typing import TYPE_CHECKING

from app.enrich.etypes import AnyToken, PosDefinition, SlimPosDefinition

if TYPE_CHECKING:
    from app.models.mixins import TimestampMixin

KANGXI_RADICALS = "\u2f00-\u2fd5"  # https://en.wikipedia.org/wiki/Kangxi_radical
CJK_RADICALS_SUPPLEMENT = "\u2e80-\u2ef3"  # https://en.wikipedia.org/wiki/CJK_Radicals_Supplement
CHINESE_CHARACTERS = "\u4e00-\u9fff"

ZHHANS_CHARS_RE = re.compile(f".*[{KANGXI_RADICALS}{CJK_RADICALS_SUPPLEMENT}{CHINESE_CHARACTERS}]+.*")

SIMPLIFIED_UTF8_ORD_MIN = 19968  # why did I think this should be 22909???
SIMPLIFIED_UTF8_ORD_MAX = 40869  # why did I think this should be 40869???
KANGXI_RADICALS_UTF8_ORD_MIN = 12032
KANGXI_RADICALS_UTF8_ORD_MAX = 12245
CJK_RADICALS_SUPPLEMENT_UTF8_ORD_MIN = 11904  # why did I think this should be 11912???
CJK_RADICALS_SUPPLEMENT_UTF8_ORD_MAX = 12019


# FIXME: replace with https://github.com/tsroten/hanzidentifier or https://github.com/tsroten/zhon
# FIXME: this is language specific...
def to_enrich(word: str) -> bool:
    return bool(ZHHANS_CHARS_RE.search(word))


def is_useful_character(char: str) -> bool:
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


def phone_rep(token: AnyToken) -> str:
    return token.get("p") or token["pinyin"]


# def do_response(response):
#     response["Access-Control-Allow-Origin"] = "*"
#     response["Access-Control-Allow-Methods"] = "POST, OPTIONS"
#     response["Access-Control-Allow-Headers"] = "X-Requested-With, Content-Type, Authorization"
#     return response


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
