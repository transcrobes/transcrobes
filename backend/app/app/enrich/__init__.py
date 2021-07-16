# -*- coding: utf-8 -*-
from __future__ import annotations

import asyncio
import json  # import orjson as json
import logging
import os
import re
import time
from abc import ABC, abstractmethod
from typing import TYPE_CHECKING

from app.core.config import settings
from app.db.session import async_session
from app.enrich.etypes import AnyToken, Sentence
from app.enrich.transliterate import Transliterator
from app.models import AuthUser
from app.ndutils import lemma
from fastapi.routing import APIRouter
from jinja2 import Template
from sqlalchemy.ext.asyncio.session import AsyncSession

if TYPE_CHECKING:
    from app.enrich.data import EnrichmentManager

logger = logging.getLogger(__name__)

DEFINITIONS_JSON_CACHE_FILE_PREFIX_REGEX = r"definitions-\d{10}\.\d{1,8}-\d{1,8}-"
DEFINITIONS_JSON_CACHE_FILE_SUFFIX_REGEX = r"\.json"
DEFINITIONS_JSON_CACHE_DIR_SUFFIX_REGEX = r"\_json"
HANZI_JSON_CACHE_FILE_REGEX = r"hanzi-\d{3}\.json"


def latest_definitions_json_dir_path(user: AuthUser) -> str:
    find_re = (
        DEFINITIONS_JSON_CACHE_FILE_PREFIX_REGEX
        + "-".join(user.dictionary_ordering.split(","))
        + DEFINITIONS_JSON_CACHE_DIR_SUFFIX_REGEX
    )
    logger.debug(f"Looking for the latest definitions dir using regex: {find_re=}")
    try:
        return sorted(
            [f.path for f in os.scandir(settings.DEFINITIONS_CACHE_DIR) if f.is_dir() and re.match(find_re, f.name)]
        )[-1]
    except IndexError:
        logger.error(
            "Unable to find a definitions file for user %s using %s with re %s",
            user,
            user.dictionary_ordering,
            find_re,
        )
    return ""


def definitions_json_paths(user: AuthUser, router: APIRouter) -> dict:
    jsons_path = latest_definitions_json_dir_path(user)
    find_re = r"\d{1,8}\.json"

    # FIXME: this shouldn't be hard-coded...
    exports_base = (
        settings.API_V1_STR
        + "/enrich"
        + router.url_path_for("exports_json", resource_path=os.path.basename(jsons_path))
    )
    logger.debug(f"Getting list of export files in dir: {exports_base=}")
    files = sorted(
        [
            os.path.join(exports_base, os.path.basename(f.path))
            for f in os.scandir(jsons_path)
            if f.is_file() and re.match(find_re, f.name)
        ]
    )
    logger.debug("The latest export files for user %s are %s", user, files)

    return files


def definitions_path_json_as_string(path: str) -> str:
    json_path = os.path.join(settings.DEFINITIONS_CACHE_DIR, path)
    with open(json_path, encoding="utf8") as fh:
        return fh.read()


def hanzi_json_paths(user_id: int, router: APIRouter) -> dict:
    exports_base = settings.API_V1_STR + "/enrich"
    files = sorted(
        [
            exports_base + router.url_path_for("hzexports_json", resource_path=os.path.basename(f.path))
            for f in os.scandir(settings.HANZI_CACHE_DIR)
            if f.is_file() and re.match(HANZI_JSON_CACHE_FILE_REGEX, f.name)
        ]
    )
    logger.debug("The latest hanzi export files for user %s are %s", user_id, files)

    return files


def hanzi_path_json_as_string(path: str) -> str:
    json_path = os.path.join(settings.HANZI_CACHE_DIR, path)
    with open(json_path, encoding="utf8") as fh:
        return fh.read()


class TransliterationException(Exception):
    pass


class Enricher(ABC):
    #
    # Abstract methods
    #
    @abstractmethod
    def needs_enriching(self, token: AnyToken) -> bool:
        pass

    @abstractmethod
    async def _add_transliterations(self, db: AsyncSession, sentence: Sentence, transliterator: Transliterator) -> bool:
        pass

    @abstractmethod
    async def _add_slim_transliterations(
        self, db: AsyncSession, sentence: Sentence, transliterator: Transliterator
    ) -> bool:  # noqa:C901  # pylint: disable=R0912
        pass

    @abstractmethod
    def _set_best_guess(self, sentence: Sentence, token: AnyToken, token_definition):
        pass

    @abstractmethod
    def _set_slim_best_guess(self, sentence: Sentence, token: AnyToken, token_definition):
        pass

    @abstractmethod
    def _cleaned_sentence(self, sentence: Sentence):
        pass

    @abstractmethod
    def get_simple_pos(self, token: AnyToken):
        pass

    @abstractmethod
    def clean_text(self, text: str):
        pass

    #
    # Private/Protected methods
    #
    @staticmethod
    def _text_from_sentence(sentence):
        text = ""
        tokens = sentence.get("t") or sentence["tokens"]
        for token in tokens:
            text += token.get("before", "") + (token.get("ot") or token.get("l") or token["originalText"])
        text += tokens[-1].get("after", "")
        return text

    #
    # Public methods
    #
    def __init__(self, config):
        self._config = config

    @staticmethod
    def is_clean(token):
        word = lemma(token)
        if word.startswith("<") and word.endswith(">"):  # html
            logger.debug("Looks like '%s' only has html, not adding to translatables", word)
            return False
        return True

    async def enrich_parse_to_aids_json(
        self, timestamp, slim_model, manager, full_enrich: bool, deep_transliterations: bool
    ):
        logger.debug("Attempting to async slim_model enrich: '%s'", slim_model)

        combined = await self._enrich_slim_model(slim_model, manager, full_enrich, deep_transliterations)

        # Here we are still using the old way of generating which adds new properties in-place
        # so we split to multiple files
        aids_model = {"s": []}
        for sentence in combined:
            hsentence = []
            for token in sentence["t"]:
                if "p" in token:  # there is maybe a cleaner way to do this
                    hsentence.append(dict((d, token.pop(d)) for d in ["p", "bg"]))
                else:
                    hsentence.append({})
            aids_model["s"].append({"t": hsentence, "l1": sentence.pop("l1")})

        return {timestamp: aids_model}

    async def enrich_to_json(
        self, text: str, manager: EnrichmentManager, full_enrich: bool, deep_transliterations: bool
    ):
        logger.debug("Attempting to async enrich: '%s'", text)
        clean_text = self.clean_text(text)
        raw_model = await manager.parser().parse(clean_text)
        parsed_slim_model = manager.enricher().slim_parse(raw_model)
        model = {"s": await self._enrich_slim_model(parsed_slim_model, manager, full_enrich, deep_transliterations)}
        match = re.match(r"^\s+", text)
        if match:
            model["sws"] = match.group(0)
        match = re.search(r"\s+$", text)
        if match:
            model["ews"] = match.group(0)
        model["id"] = time.time_ns()
        return model

    async def enrich_to_json_phat(self, text: str, manager: EnrichmentManager, full_enrich: bool = False):
        logger.debug("Attempting to async enrich: '%s'", text)

        clean_text = self.clean_text(text)
        raw_model = await manager.parser().parse(clean_text)
        model = {"s": await self._enrich_model(raw_model, manager, full_enrich)}
        match = re.match(r"^\s+", text)
        if match:
            model["sws"] = match.group(0)
        match = re.search(r"\s+$", text)
        if match:
            model["ews"] = match.group(0)

        # FIXME: we should be able to accept a list of fields to return, rather than filtering
        # via hardcode here
        for sentence in model["s"]:
            slim_tokens = []
            for token in sentence["tokens"]:
                new_token = {
                    # "lemma": lemma(token),
                    "l": lemma(token),
                }
                if "id" in token or "bg" in token:
                    # if "bg" in token:
                    # new_token["id"] = token["id"]
                    if full_enrich:
                        new_token["p"] = token["phone"]
                        new_token["bg"] = token["bg"]["nt"]
                        new_token["np"] = token["np"]
                    new_token["pos"] = token["pos"]

                slim_tokens.append(new_token)
            sentence["tokens"] = slim_tokens
        model["id"] = time.time_ns()
        return model

    @staticmethod
    def enriched_text_fragment(text, model):
        # FIXME: this is probably dangerous, I am not escaping properly
        logger.debug("Attempting to async enrich to html: '%s'", text)
        template = Template("<enriched-text-fragment data-model='{{ model }}'>{{ text }}</enriched-text-fragment>")
        context = {"model": json.dumps(model), "text": text}
        return template.render(context)

    @staticmethod
    def _clean_token(token):
        for key in [
            "index",
            "word",
            "originalText",
            "characterOffsetBegin",
            "characterOffsetEnd",
            "pos",
        ]:
            try:
                del token[key]
            except KeyError:
                pass

    def slim_parse(self, fat_model):
        slim_model = []
        for sentence in fat_model["sentences"]:
            slim_sentence = []
            for token in sentence["tokens"]:
                if self.is_clean(token) and self.needs_enriching(token):
                    # slim_sentence.append({"l": token["lemma"], "pos": token["pos"]})
                    slim_sentence.append({"l": token["originalText"], "pos": token["pos"]})
                else:
                    # slim_sentence.append({"l": token["lemma"]})
                    slim_sentence.append({"l": token["originalText"]})
            slim_model.append({"t": slim_sentence})
        return slim_model

    #
    # FIXME: move - put here for easy navigation
    async def _enrich_model(self, model, manager: EnrichmentManager, full_enrich: bool):
        sentences = await asyncio.gather(
            *[self._enrich_sentence(sentence, manager, full_enrich) for sentence in model["sentences"]],
        )
        return sentences

    async def _enrich_sentence(self, sentence, manager: EnrichmentManager, full_enrich: bool):
        # FIXME: find out how to put this in the header without a circular dep
        from app.enrich.models import definition  # pylint: disable=C0415

        async with async_session() as db:
            if full_enrich:
                # transliterate the sentence as a whole - this will almost always hit the external API and
                # the lift in accuracy is likely only for a few well known words - deep is definitely better
                # but much slower and actually costs real money
                # FIXME: actually we could check whether we've already transliterated the same/a similar sentence
                # rather than do a whole new attempt, still without using translation credit...
                await self._add_transliterations(db, sentence, manager.transliterator())
                original_sentence = self._text_from_sentence(sentence).strip()
                sentence["os"] = original_sentence  # used to be _cleaned_sentence
                # We aren't currently using the alignment, so ignore
                # sentence["l1"], sentence["al"] = await manager.default().atranslate(original_sentence)
                sentence["l1"], _ = await manager.default().translate(db, original_sentence)

            else:
                for token in sentence["tokens"]:
                    token["phone"] = (await manager.transliterator().transliterate(db, token["originalText"])).split()

            logger.debug("Looking for tokens to translate in %s", sentence)

            for token in sentence["tokens"]:
                if not self.is_clean(token) or not self.needs_enriching(token):
                    continue
                token_definition = await definition(db, manager, token)
                token["id"] = token_definition["id"]  # BingAPILookup id
                token["np"] = self.get_simple_pos(token)  # Normalised POS

                if full_enrich:
                    self._set_best_guess(sentence, token, token_definition["defs"])

        return sentence

    #
    # FIXME: move - put here for easy navigation
    async def _enrich_slim_model(
        self, slim_model, manager: EnrichmentManager, full_enrich: bool, deep_transliterations: bool
    ):
        # FIXME: clean later
        model = slim_model["s"] if isinstance(slim_model, dict) else slim_model
        return await asyncio.gather(
            *[self._enrich_slim_sentence(sentence, manager, full_enrich, deep_transliterations) for sentence in model],
        )

    async def _enrich_slim_sentence(
        self, sentence, manager: EnrichmentManager, full_enrich: bool, deep_transliterations: bool
    ):
        # FIXME: find out how to put this in the header without a circular dep
        from app.enrich.models import definition  # pylint: disable=C0415

        async with async_session() as db:
            if deep_transliterations:
                # transliterate the sentence as a whole - this will almost always hit the external API and
                # the lift in accuracy is likely only for a few well known words - deep is definitely better
                # but much slower and actually costs real money
                # FIXME: actually we could check whether we've already transliterated the same/a similar sentence
                # rather than do a whole new attempt, still without using translation credit...
                await self._add_slim_transliterations(db, sentence, manager.transliterator())

            if full_enrich:
                original_sentence = self._text_from_sentence(sentence).strip()
                # We aren't currently using the alignment, so ignore
                # sentence["l1"], sentence["al"] = await manager.default().translate(db, original_sentence)
                sentence["l1"], _ = await manager.default().translate(db, original_sentence)
                # Can recreate in the client, storing here is just a waste
                # sentence["os"] = original_sentence  # used to be _cleaned_sentence

                logger.debug("Looking for tokens to translate in %s", sentence)

            for token in sentence["t"]:
                if not self.is_clean(token) or not self.needs_enriching(token):
                    continue
                token_definition = await definition(db, manager, token)
                if full_enrich:
                    # no longer used, as we have this info in the client
                    # token["id"] = token_definition["id"]  # BingAPILookup id
                    # token["np"] = self.get_simple_pos(token)  # Normalised POS
                    self._set_slim_best_guess(sentence, token, token_definition["defs"])

        return sentence
