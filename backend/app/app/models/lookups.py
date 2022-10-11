# -*- coding: utf-8 -*-
from __future__ import annotations

from app.db.base_class import Base
from app.models.mixins import CachedAPIJSONLookupMixin, JSONLookupMixin


class BingApiLookup(CachedAPIJSONLookupMixin, Base):
    SHORT_NAME = "mst"
    FALLBACK_SHORT_NAME = "fbk"


class BingApiTranslation(CachedAPIJSONLookupMixin, Base):
    pass


class BingApiTransliteration(CachedAPIJSONLookupMixin, Base):
    pass


class ZhHskLookup(JSONLookupMixin, Base):
    SHORT_NAME = "hsk"


class ZhSubtlexLookup(JSONLookupMixin, Base):
    SHORT_NAME = "frq"


class ZhhansEnABCLookup(JSONLookupMixin, Base):
    SHORT_NAME = "abc"


class ZhhansEnCCCLookup(JSONLookupMixin, Base):
    SHORT_NAME = "ccc"


class EnZhhansABCLookup(JSONLookupMixin, Base):
    SHORT_NAME = "abc"


class EnZhhansGoogLookup(JSONLookupMixin, Base):
    SHORT_NAME = "goo"


class EnSubtlexLookup(JSONLookupMixin, Base):
    SHORT_NAME = "frq"


class EnCMULookup(JSONLookupMixin, Base):
    SHORT_NAME = "cmu"
