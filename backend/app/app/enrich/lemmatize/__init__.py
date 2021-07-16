# -*- coding: utf-8 -*-
from __future__ import annotations

from abc import ABC, abstractmethod


class WordLemmatizer(ABC):
    @abstractmethod
    def lemmatize(self, lword):
        pass
