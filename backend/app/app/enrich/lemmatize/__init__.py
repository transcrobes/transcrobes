# -*- coding: utf-8 -*-
from __future__ import annotations

from abc import ABC, abstractmethod


class WordLemmatizer(ABC):
    def __init__(self, config):
        self._config = config

    @abstractmethod
    async def lemmatize(self, lword) -> set[str]:
        pass
