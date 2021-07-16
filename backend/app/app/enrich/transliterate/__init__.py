# -*- coding: utf-8 -*-
from __future__ import annotations

from abc import ABC, abstractmethod

from sqlalchemy.ext.asyncio.session import AsyncSession


class Transliterator(ABC):
    @abstractmethod
    async def transliterate(self, db: AsyncSession, text: str, refresh: bool = False):
        pass

    @staticmethod
    @abstractmethod
    def name():
        pass
