# -*- coding: utf-8 -*-
from __future__ import annotations

from abc import ABC, abstractmethod

from app.enrich.etypes import EntryDefinition, Token
from sqlalchemy.ext.asyncio.session import AsyncSession


class Translator(ABC):
    @staticmethod
    @abstractmethod
    def name() -> str:
        pass

    @abstractmethod
    async def get_standardised_defs(self, db: AsyncSession, token: Token) -> EntryDefinition:
        pass

    @abstractmethod
    async def get_standardised_fallback_defs(self, db: AsyncSession, token: Token) -> EntryDefinition:
        pass

    @abstractmethod
    async def pos_synonyms(self, db: AsyncSession, token: Token):
        pass

    @abstractmethod
    async def sound_for(
        self, db: AsyncSession, token: Token
    ) -> str:  # FIXME: the entries should actually be able to do this per POS
        pass


class DefaultTranslator(Translator):
    @abstractmethod
    async def translate(self, db: AsyncSession, text: str):
        pass
