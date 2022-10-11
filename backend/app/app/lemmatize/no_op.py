# -*- coding: utf-8 -*-

from enrich.data import PersistenceProvider
from enrich.lemmatize import WordLemmatizer


class NoOpWordLemmatizer(PersistenceProvider, WordLemmatizer):
    def name(self):
        return "noop"

    def _load(self):
        return {}

    def lemmatize(self, lword):
        return [lword]
