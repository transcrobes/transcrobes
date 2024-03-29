# -*- coding: utf-8 -*-
from __future__ import annotations

from app.db.base_class import Base
from app.models.mixins import ActivatorTimestampMixin, CachedAPIJSONLookupMixin, JSONLookupMixin
from sqlalchemy import Column, Integer, String, Text


class BingApiLookup(CachedAPIJSONLookupMixin, Base):
    SHORT_NAME = "mst"
    FALLBACK_SHORT_NAME = "fbk"
    __table_args__ = (
        CachedAPIJSONLookupMixin.unique,
        CachedAPIJSONLookupMixin.lower_index("BingApiLookup".lower()),
    )


class BingApiTranslation(CachedAPIJSONLookupMixin, Base):
    __table_args__ = (
        CachedAPIJSONLookupMixin.unique,
        CachedAPIJSONLookupMixin.lower_index("BingApiTranslation".lower()),
    )


class BingApiTransliteration(CachedAPIJSONLookupMixin, Base):
    __table_args__ = (
        CachedAPIJSONLookupMixin.unique,
        CachedAPIJSONLookupMixin.lower_index("BingApiTransliteration".lower()),
    )


class ZhHskLookup(JSONLookupMixin, Base):
    SHORT_NAME = "hsk"
    __table_args__ = (JSONLookupMixin.lower_index("ZhHskLookup".lower()),)


class ZhSubtlexLookup(JSONLookupMixin, Base):
    SHORT_NAME = "frq"
    __table_args__ = (JSONLookupMixin.lower_index("ZhSubtlexLookup".lower()),)


class ZhhansEnABCLookup(JSONLookupMixin, Base):
    SHORT_NAME = "abc"
    __table_args__ = (JSONLookupMixin.lower_index("ZhhansEnABCLookup".lower()),)


class ZhhansEnCCCLookup(JSONLookupMixin, Base):
    SHORT_NAME = "ccc"
    __table_args__ = (JSONLookupMixin.lower_index("ZhhansEnCCCLookup".lower()),)


class EnZhhansABCLookup(JSONLookupMixin, Base):
    SHORT_NAME = "abc"
    __table_args__ = (JSONLookupMixin.lower_index("EnZhhansABCLookup".lower()),)


class EnZhhansGoogLookup(JSONLookupMixin, Base):
    SHORT_NAME = "goo"
    __table_args__ = (JSONLookupMixin.lower_index("EnZhhansGoogLookup".lower()),)


class EnSubtlexLookup(JSONLookupMixin, Base):
    SHORT_NAME = "frq"
    __table_args__ = (JSONLookupMixin.lower_index("EnSubtlexLookup".lower()),)


class EnCMULookup(JSONLookupMixin, Base):
    SHORT_NAME = "cmu"
    __table_args__ = (JSONLookupMixin.lower_index("EnCMULookup".lower()),)


class OpenAIApiLookup(ActivatorTimestampMixin, CachedAPIJSONLookupMixin, Base):
    model_name = Column(Text, nullable=False)
    source_text = Column(String(25000), nullable=False, index=True)
    prompt_version = Column(Integer, nullable=False)
    prompt_type = Column(Integer, nullable=False)  # data.ContentQuestion.QUESTION_TYPE
    __table_args__ = (
        CachedAPIJSONLookupMixin.unique,
        CachedAPIJSONLookupMixin.lower_index("OpenAIApiLookup".lower()),
    )
