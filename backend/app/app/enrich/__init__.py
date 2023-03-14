# -*- coding: utf-8 -*-
from __future__ import annotations

import asyncio
import json  # import orjson as json
import logging
import os
import re
import time
from abc import ABC, abstractmethod
from enum import Enum
from typing import TYPE_CHECKING

from app.cache import TimeStampedDef
from app.core.config import settings
from app.data.models import DATA_JS_SUFFIX
from app.db.session import async_session
from app.enrich.transliterate import Transliterator
from app.etypes import LANG_PAIR_SEPARATOR, AnyToken, Sentence
from app.models import AuthUser
from app.ndutils import lemma, orig_text, to_enrich
from bs4 import BeautifulSoup
from fastapi.routing import APIRouter
from jinja2 import Template
from sqlalchemy.ext.asyncio.session import AsyncSession

if TYPE_CHECKING:
    from app.enrich.data import EnrichmentManager

logger = logging.getLogger(__name__)

DEFINITIONS_JSON_CACHE_FILE_PREFIX_REGEX = r"definitions-\d{10}\.\d{1,8}-\d{1,8}-"
DEFINITIONS_JSON_CACHE_FILE_SUFFIX_REGEX = r"\.json"
DEFINITIONS_JSON_CACHE_DIR_SUFFIX_REGEX = r"\_json"

HANZI_JSON_CACHE_DIRECTORY_REGEX = r"\d{10}"
HANZI_JSON_CACHE_FILE_REGEX = r"hanzi-\d{3}\.json"


class TokenPhoneType(Enum):
    NONE = 0
    DEFAULT = 1
    DEEP = 2


def best_surface_def(token, all_token_definitions):
    lem = lemma(token)
    ot = orig_text(token)
    mbg = (
        all_token_definitions.get(ot)
        or all_token_definitions.get(ot.lower())
        or all_token_definitions.get(lem)
        or all_token_definitions.get(lem.lower())
    )
    if not mbg:
        mbg = next(all_token_definitions.values(), None) or [0.0, "{}", 0]

    return json.loads(mbg[1])


def best_deep_def(token, all_token_definitions):
    lem = lemma(token)
    ot = orig_text(token)
    mbg = (
        all_token_definitions.get(lem.lower())
        or all_token_definitions.get(lem)
        or all_token_definitions.get(ot.lower())
        or all_token_definitions.get(ot)
    )
    if not mbg:
        mbg = next(all_token_definitions.values(), None) or [0.0, "{}", 0]

    return json.loads(mbg[1])


def lang_prefix(lang_pair: str) -> str:
    return f"{lang_pair}{LANG_PAIR_SEPARATOR}"


def latest_definitions_json_dir_path(user: AuthUser) -> str:
    find_re = (
        lang_prefix(f"{user.from_lang}{LANG_PAIR_SEPARATOR}{user.to_lang}")
        + DEFINITIONS_JSON_CACHE_FILE_PREFIX_REGEX
        + "-".join(user.dictionary_ordering.split(","))
        + DEFINITIONS_JSON_CACHE_DIR_SUFFIX_REGEX
    )
    logger.debug(f"Looking for the latest definitions dir using regex: {find_re=}")
    try:
        return sorted(
            [
                f.path.removeprefix(lang_prefix(user))
                for f in os.scandir(settings.DEFINITIONS_CACHE_DIR)
                if f.is_dir() and re.match(find_re, f.name)
            ]
        )[-1]
    except IndexError:
        logger.error(
            "Unable to find a definitions file for user %s using %s with re %s",
            user,
            user.dictionary_ordering,
            lang_prefix(user),
            find_re,
        )
    return ""


def latest_character_json_dir_path() -> str:
    find_re = HANZI_JSON_CACHE_DIRECTORY_REGEX
    logger.debug(f"Looking for the latest hanzi dir using regex: {find_re=}")
    try:
        return sorted(
            [f.path for f in os.scandir(settings.HANZI_CACHE_DIR) if f.is_dir() and re.match(find_re, f.name)]
        )[-1]
    except IndexError:
        logger.error(
            "Unable to find a hanzi path with re %s",
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


def hanzi_json_paths(router: APIRouter) -> dict:
    jsons_path = latest_character_json_dir_path()
    exports_base = (
        settings.API_V1_STR
        + "/enrich"
        + router.url_path_for("hzexports_json", resource_path=os.path.basename(jsons_path))
    )
    files = sorted(
        [
            os.path.join(exports_base, os.path.basename(f.path))
            for f in os.scandir(jsons_path)
            if f.is_file() and re.match(HANZI_JSON_CACHE_FILE_REGEX, f.name)
        ]
    )
    logger.debug("The latest hanzi export files for are %s", files)

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
    def _set_best_guess(
        self,
        sentence: Sentence,
        token: AnyToken,
        token_definitions: list[TimeStampedDef],
        available_def_providers: list[str],
    ):
        pass

    @abstractmethod
    def _set_slim_best_guess(
        self,
        sentence: Sentence,
        token: AnyToken,
        token_definitions: list[TimeStampedDef],
        phone,
        available_def_providers: list[str],
    ):
        pass

    @abstractmethod
    def _cleaned_sentence(self, sentence: Sentence):
        pass

    @abstractmethod
    def get_simple_pos(self, token: AnyToken):
        pass

    @abstractmethod
    def normalise_punctuation(self, token: AnyToken):
        pass

    @abstractmethod
    def clean_text(self, text: str, remove_whitespace: bool) -> str:
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
        self,
        timestamp,
        slim_model,
        manager,
        translate_sentence: bool,
        best_guess: bool,
        phone_type: TokenPhoneType,
        fill_id: bool,
        available_def_providers: list[str],
        clean: bool = True,
    ):
        logger.debug("Attempting to async slim_model enrich: '%s'", slim_model)

        combined = await self.enrich_slim_model(
            slim_model,
            manager,
            translate_sentence,
            best_guess,
            phone_type,
            fill_id,
            available_def_providers,
        )

        # Here we are still using the old way of generating which adds new properties in-place
        # so we split to multiple files
        aids_model = {"s": []}
        for sentence in combined:
            if not clean:
                aids_model["s"].append(sentence)
                # return {timestamp: combined}
            else:
                hsentence = []
                for token in sentence["t"]:
                    extras = {}
                    if "p" in token:  # when phone_type >= TokenPhoneType.NONE
                        extras["p"] = token.pop("p")
                    if "bg" in token:  # when best_guess == True
                        extras["bg"] = token.pop("bg")
                    if "id" in token:  # when fill_id == True
                        extras["id"] = token.pop("id")
                    hsentence.append(extras)
                new_sentence = {"t": hsentence}
                if "l1" in sentence:
                    new_sentence["l1"] = sentence["l1"]
                aids_model["s"].append(new_sentence)

        return {timestamp: aids_model}

    async def enrich_to_json(
        self,
        text: str,
        manager: EnrichmentManager,
        translate_sentence: bool,
        best_guess: bool,
        phone_type: TokenPhoneType,
        fill_id: bool,
        available_def_providers: list[str],
    ):
        logger.debug("Attempting to async enrich: '%s'", text)
        ctext = self.clean_text(text)
        raw_model = await manager.parser().parse(ctext)
        parsed_slim_model = manager.enricher().slim_parse(raw_model)
        model = {
            "s": await self.enrich_slim_model(
                parsed_slim_model, manager, translate_sentence, best_guess, phone_type, fill_id, available_def_providers
            )
        }
        match = re.match(r"^\s+", text)
        if match:
            model["sws"] = match.group(0)
        match = re.search(r"\s+$", text)
        if match:
            model["ews"] = match.group(0)
        model["id"] = time.time_ns()
        return model

    async def enrich_to_json_phat(
        self,
        text: str,
        manager: EnrichmentManager,
        translate_sentence: bool = False,
        best_guess: bool = False,
        deep_transliterations: bool = False,
    ):
        logger.debug("Attempting to async enrich: '%s'", text)

        ctext = self.clean_text(text)
        raw_model = await manager.parser().parse(ctext)
        model = {
            "s": await self._enrich_model(raw_model, manager, translate_sentence, best_guess, deep_transliterations)
        }
        raise Exception("this is broken")
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
                    "l": lemma(token),
                }
                if "id" in token or "bg" in token:
                    if "id" in token:
                        new_token["id"] = token["id"]
                    if deep_transliterations:
                        new_token["p"] = token["phone"]
                    if best_guess:
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
                self.normalise_punctuation(token)
                nt = {}
                if self.is_clean(token) and self.needs_enriching(token):
                    # should I be using token["word"] for word?
                    if token["originalText"] == token["lemma"]:
                        nt = {"l": token["originalText"], "pos": token["pos"]}
                    else:
                        nt = {"w": token["originalText"], "l": token["lemma"], "pos": token["pos"]}
                else:
                    nt = {"l": token["originalText"]}
                if "before" in token and token["before"]:
                    nt["b"] = token["before"]
                if "after" in token and token["after"]:
                    nt["a"] = token["after"]

                slim_sentence.append(nt)

            slim_model.append({"t": slim_sentence})
        return slim_model

    #
    # FIXME: move - put here for easy navigation
    async def _enrich_model(
        self, model, manager: EnrichmentManager, translate_sentence: bool, best_guess: bool, deep_transliterations: bool
    ):
        raise Exception("Actually there are logic problems with this method..., namely the phone stuff")

        sentences = await asyncio.gather(
            *[
                self._enrich_sentence(sentence, manager, translate_sentence, best_guess, deep_transliterations)
                for sentence in model["sentences"]
            ],
        )
        return sentences

    async def _enrich_sentence(
        self,
        sentence,
        manager: EnrichmentManager,
        translate_sentence: bool,
        best_guess: bool,
        deep_transliterations: bool,
    ):
        # FIXME: find out how to put this in the header without a circular dep
        from app.enrich.models import definitions  # pylint: disable=C0415

        raise Exception("Actually there are logic problems with this method..., namely the phone stuff")

        async with async_session() as db:
            if translate_sentence:
                original_sentence = self._text_from_sentence(sentence).strip()
                sentence["os"] = original_sentence  # used to be _cleaned_sentence
                # We aren't currently using the alignment, so ignore
                # sentence["l1"], sentence["al"] = await manager.default().atranslate(original_sentence)
                sentence["l1"], _ = await manager.default().translate(db, original_sentence)

            if deep_transliterations:
                # transliterate the sentence as a whole - this will almost always hit the external API and
                # the lift in accuracy is likely only for a few well known words - deep is definitely better
                # but much slower and actually costs real money
                # FIXME: actually we could check whether we've already transliterated the same/a similar sentence
                # rather than do a whole new attempt, still without using translation credit...
                await self._add_transliterations(db, sentence, manager.transliterator())
            else:
                for token in sentence["tokens"]:
                    token["phone"] = (await manager.transliterator().transliterate(db, token["originalText"])).split()

            logger.debug("Looking for tokens to translate in %s", sentence)

            for token in sentence["tokens"]:
                if not self.is_clean(token) or not self.needs_enriching(token):
                    continue
                token_definition = await definitions(db, manager, token)
                token["id"] = token_definition["id"]  # BingAPILookup id
                token["np"] = self.get_simple_pos(token)  # Normalised POS

                if best_guess:
                    self._set_best_guess(sentence, token, token_definition["defs"])

        return sentence

    #
    # FIXME: move - put here for easy navigation
    async def enrich_slim_model(
        self,
        slim_model,
        manager: EnrichmentManager,
        translate_sentence: bool,
        best_guess: bool,
        phone_type: TokenPhoneType,
        fill_id: bool,
        available_def_providers: list[str],
    ):
        # FIXME: clean later
        model = slim_model["s"] if isinstance(slim_model, dict) else slim_model
        return await asyncio.gather(
            *[
                self._enrich_slim_sentence(
                    sentence, manager, translate_sentence, best_guess, phone_type, fill_id, available_def_providers
                )
                for sentence in model
            ],
        )

    async def _enrich_slim_sentence(
        self,
        sentence,
        manager: EnrichmentManager,
        translate_sentence: bool,
        best_guess: bool,
        phone_type: TokenPhoneType,
        fill_id: bool,
        available_def_providers: list[str],
    ):
        # FIXME: find out how to put this in the header without a circular dep
        from app.enrich.models import definitions  # pylint: disable=C0415

        async with async_session() as db:
            if phone_type == TokenPhoneType.DEEP:
                # transliterate the sentence as a whole - this will almost always hit the external API and
                # the lift in accuracy is likely only for a few well known words - deep is definitely better
                # but much slower and actually costs real money
                # FIXME: actually we could check whether we've already transliterated the same/a similar sentence
                # rather than do a whole new attempt, still without using translation credit...
                await self._add_slim_transliterations(db, sentence, manager.transliterator())

            if translate_sentence:
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
                # calling definition also ensures the token is properly in the db, so is required
                token_definitions = await definitions(db, manager, token)
                token_definition = best_surface_def(token, token_definitions)
                if fill_id:
                    token["id"] = token_definition["id"]
                    if len(token_definitions) > 1:
                        token["oids"] = [
                            def_id for _a, _b, def_id in token_definitions.values() if def_id != token["id"]
                        ]
                if phone_type == TokenPhoneType.DEFAULT:
                    token["p"] = token_definition["p"].split()
                if best_guess:
                    # no longer used, as we have this info in the client
                    # token["np"] = self.get_simple_pos(token)  # Normalised POS
                    self._set_slim_best_guess(
                        sentence, token, token_definitions, token_definition["p"], available_def_providers
                    )
        return sentence


async def enrich_html_fragment(xhtml, manager: EnrichmentManager):
    soup = BeautifulSoup(xhtml, "html.parser")  # it appears only html.parser doesn't fail when there are BOM :-(
    text_nodes = soup.find_all(text=True)
    slim_models = {}
    for text_node in text_nodes:
        text = manager.enricher().clean_text(str(text_node))
        if not re.search(r"\S+", text) or not to_enrich(text, manager.from_lang):
            continue

        parse = await manager.parser().parse(text)
        parsed_slim_model = {"s": manager.enricher().slim_parse(parse)}

        match = re.match(r"^\s+", text)
        if match:
            parsed_slim_model["sws"] = match.group(0)
        match = re.search(r"\s+$", text)
        if match:
            parsed_slim_model["ews"] = match.group(0)

        timestamp = time.time_ns()
        text_fragment = soup.new_tag("enriched-text-fragment")
        text_fragment["id"] = timestamp
        text_fragment.string = text
        slim_models[timestamp] = parsed_slim_model
        text_node.replace_with(text_fragment)

    return str(soup), slim_models


async def enrich_html_to_html(chapter_id, xhtml, manager: EnrichmentManager):
    soup = BeautifulSoup(xhtml, "html.parser")  # it appears only html.parser doesn't fail when there are BOM :-(
    if not soup.head.title:  # html MUST have a head->title
        soup.head.append(soup.new_tag("title"))
        soup.head.title.string = "Title"

    data_json = soup.new_tag("script")
    data_json["src"] = f"{os.path.basename(chapter_id)}{DATA_JS_SUFFIX}"
    soup.head.append(data_json)

    text_nodes = soup.body.find_all(text=True)
    slim_models = {}
    for text_node in text_nodes:
        text = manager.enricher().clean_text(str(text_node))

        if not re.search(r"\S+", text) or not to_enrich(text, manager.from_lang):
            continue

        logger.debug(f"Starting parse for {chapter_id}: {text[:100]}")
        parse = await manager.parser().parse(text)
        parsed_slim_model = {"s": manager.enricher().slim_parse(parse)}

        match = re.match(r"^\s+", text)
        if match:
            parsed_slim_model["sws"] = match.group(0)
        match = re.search(r"\s+$", text)
        if match:
            parsed_slim_model["ews"] = match.group(0)

        timestamp = time.time_ns()
        text_fragment = soup.new_tag("enriched-text-fragment")
        text_fragment["id"] = timestamp
        text_fragment.string = text
        slim_models[timestamp] = parsed_slim_model
        text_node.replace_with(text_fragment)

    return chapter_id, str(soup), slim_models


async def enrich_plain_to_html(unique_key, start_text, manager: EnrichmentManager):
    lines = ""
    slim_models = {}
    text_node = manager.enricher().clean_text(str(start_text))

    for raw_line in text_node.splitlines():
        text = "".join(c for c in raw_line.strip() if c.isprintable())
        if not re.search(r"\S+", text) or not to_enrich(text, manager.from_lang):
            template_string = text.strip()
        else:
            logger.debug(f"Starting parse for {unique_key}: {text[:100]}")
            parsed_slim_model = {"s": manager.enricher().slim_parse(await manager.parser().parse(text))}

            match = re.match(r"^\s+", text)
            if match:
                parsed_slim_model["sws"] = match.group(0)
            match = re.search(r"\s+$", text)
            if match:
                parsed_slim_model["ews"] = match.group(0)

            timestamp = time.time_ns()
            template_string = f"<enriched-text-fragment id='{timestamp}'>{text}</enriched-text-fragment>"
            slim_models[timestamp] = parsed_slim_model

        lines += f"<br>{template_string}" if (lines and text.startswith("-")) else template_string  # + "&nbsp;"

    return unique_key, lines, slim_models
