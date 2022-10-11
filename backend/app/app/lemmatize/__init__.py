# -*- coding: utf-8 -*-

from abc import ABC, abstractmethod


class WordLemmatizer(ABC):
    @abstractmethod
    def lemmatize(self, lword):
        pass
