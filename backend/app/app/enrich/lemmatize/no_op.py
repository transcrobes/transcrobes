# -*- coding: utf-8 -*-
from __future__ import annotations

from app.enrich.data import PersistenceProvider

from . import WordLemmatizer


class NoOpWordLemmatizer(PersistenceProvider, WordLemmatizer):
    def name(self):
        return "noop"

    def _load(self):
        return {}

    async def lemmatize(self, lword) -> set[str]:
        return {lword}
