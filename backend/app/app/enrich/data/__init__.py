# -*- coding: utf-8 -*-
from __future__ import annotations

import importlib
import inspect

# import orjson as json
import json
import logging
from abc import ABC, abstractmethod
from typing import Any, List

from app.db.session import async_session
from app.enrich import Enricher
from app.enrich.lemmatize import WordLemmatizer
from app.enrich.metadata import Metadata
from app.enrich.parse import ParseProvider
from app.enrich.translate import DefaultTranslator, Translator
from app.enrich.transliterate import Transliterator
from sqlalchemy.ext.asyncio.session import AsyncSession
from sqlalchemy.sql.expression import select
from sqlalchemy.sql.functions import func

logger = logging.getLogger(__name__)

DEFAULT_MAX_WORD_LENGTH = 50


class PersistenceProvider(ABC):
    def __init__(self, config):
        self._config = config
        self._inmem = self._config.get("inmem")
        self.dico = self._load() if self._inmem else None
        self.model_type = None  # Children must assign

    async def __len__(self):
        if self._inmem:
            return len(self.dico.keys())

        # async def get_multi(model, db: AsyncSession, *, skip: int = 0, limit: int = 100):
        # # result = await db.execute(select(model).offset(skip).limit(limit))
        # result = await db.execute(select(model))
        # return result.scalars().all()
        async with async_session() as db:
            result = await db.execute(select(func.count("*")).select_from(self.model_type))
            return result.scalar()

    def load_to_db(self, dico, force_reload=False):  # pylint: disable=R0201
        raise Exception("Not yet migrated to fastapi")
        # for lword, entry in dico.items():
        #     dbentries = self.model_type.objects.filter(source_text=lword)
        #     if len(dbentries) == 0:
        #         dbentry = self.model_type(source_text=lword, response_json=json.dumps(entry, ensure_ascii=False))
        #         dbentry.save()
        #     elif force_reload:
        #         dbentry = dbentries.first()  # TODO: what about having more than one... :-(
        #         dbentry.source_text = lword
        #         dbentry.response_json = json.dumps(entry, ensure_ascii=False)
        #         dbentry.save()

    async def entry(self, db: AsyncSession, lword: str) -> Any:
        if self._inmem:
            return self.dico.get(lword)

        return await self._from_db(db, lword)

    async def _from_db(self, db: AsyncSession, lword: str) -> Any:
        # TODO: we can probably have duplicates if we don't make sure not to have
        # everything lowercased in the _dict and DB
        result = await db.execute(select(self.model_type).filter_by(source_text=lword))
        word = result.scalars().first()
        if word:
            return json.loads(word.response_json)

        return None

    async def _get_def(self, db: AsyncSession, lword: str) -> Any:
        return await self.entry(db, lword)

    @abstractmethod
    def _load(self):
        pass

    @staticmethod
    @abstractmethod
    def name():
        pass


# FIXME: consider reducing the number of instance attributes
class EnrichmentManager:  # pylint: disable=R0902
    @staticmethod
    def _fullname(c) -> str:
        module = c.__module__
        if module is None or module == str.__class__.__module__:
            return c.__name__
        return f"{module}.{c.__name__}"

    def _get_provider(self, classpath, parent, config, helper=None):
        logger.info(f"Loading class {classpath}")
        module_name, class_name = classpath.rsplit(".", 1)
        module = importlib.import_module(module_name.strip())
        class_ = getattr(module, class_name.strip())

        if parent not in inspect.getmro(class_):
            raise TypeError(f"All {class_name} MUST inherit from {self._fullname(parent)}")

        return class_(config) if helper is None else class_(config, helper)

    def __init__(self, name, config):
        self.from_lang = name.split(":")[0]
        self.to_lang = name.split(":")[1]
        self.config = config

        logger.info(f"Loading class enrich for {name}")
        self._enricher = self._get_provider(config["enrich"]["classname"], Enricher, config["enrich"]["config"])

        logger.info(f"Loading class parser for {name}")
        self._parser = self._get_provider(config["parse"]["classname"], ParseProvider, config["parse"]["config"])

        if "classname" in config["word_lemmatizer"]:
            logger.info(f"Loading class lemmatizer for {name}")
            self._word_lemmatizer = self._get_provider(
                config["word_lemmatizer"]["classname"],
                WordLemmatizer,
                config["word_lemmatizer"]["config"],
            )

        logger.info(f"Loading class transliterator for {name}")
        self._transliterator = self._get_provider(
            config["transliterate"]["classname"],
            Transliterator,
            config["transliterate"]["config"],
        )

        logger.info(f"Loading class metadata for {name}")
        self._metadata = []
        for provider in config["metadata"]:
            self._metadata.append(self._get_provider(provider["classname"], Metadata, provider["config"]))

        if "transliterator" in config["default"]:
            logger.info(f"Loading class transliterators for {name} for default")
            helper = self._get_provider(
                config["default"]["transliterator"]["classname"],
                Transliterator,
                config["default"]["transliterator"]["config"],
            )
            if helper is None:
                raise Exception(f"wtf for {config['default']['transliterator']['classname']}")
            logger.info(f"Loading class default for {name} with transliterator")
            self._default = self._get_provider(
                config["default"]["classname"],
                Translator,
                config["default"]["config"],
                helper,
            )
        else:
            logger.info(f"Loading class default for {name} without transliterator")
            self._default = self._get_provider(config["default"]["classname"], Translator, config["default"]["config"])

        self._secondary = []
        for provider in config["secondary"]:
            if "transliterator" in provider:
                logger.info(f'Loading class transliterators for {name} for {provider["classname"]}')
                helper = self._get_provider(
                    provider["transliterator"]["classname"],
                    Transliterator,
                    provider["transliterator"]["config"],
                )
                logger.info(f'Loading class {provider["classname"]} for {name} with translit')
                self._secondary.append(
                    self._get_provider(provider["classname"], Translator, provider["config"], helper)
                )
            else:
                logger.info(f'Loading class {provider["classname"]} for {name} without transliterator')
                self._secondary.append(self._get_provider(provider["classname"], Translator, provider["config"]))

    def enricher(self) -> Enricher:
        return self._enricher

    def parser(self) -> ParseProvider:
        return self._parser

    def word_lemmatizer(self) -> WordLemmatizer:
        return self._word_lemmatizer

    def default(self) -> DefaultTranslator:
        return self._default

    def secondary(self) -> List[Translator]:
        return self._secondary

    def metadata(self) -> List[Metadata]:
        return self._metadata

    def transliterator(self) -> Transliterator:
        return self._transliterator

    @property
    def lang_pair(self) -> str:
        return f"{self.from_lang}:{self.to_lang}"

    def max_word_length(self) -> int:
        # max_word_length_chars
        return (
            self.config["language_config"]["max_word_length_chars"]
            if self.config.get("language_config") and self.config["language_config"].get("max_word_length_chars")
            else DEFAULT_MAX_WORD_LENGTH
        )


managers: dict[str, EnrichmentManager] = {}
