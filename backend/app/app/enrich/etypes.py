# -*- coding: utf-8 -*-
from __future__ import annotations

from typing import List, TypedDict, Union


# FIXME: these are no longer correct at all!!!
class SlimPosDefinition(TypedDict):
    nt: str
    cf: str  # FIXME: is this a str?, confidence
    word: str
    phone: str


# FIXME: these are no longer correct at all!!!
class PosDefinition(TypedDict):
    upos: str  # FIXME: make this an ENUM
    opos: str  # FIXME: make this an ENUM
    normalizedTarget: str
    confidence: str
    trans_provider: str  # FIXME: make this an ENUM, or maybe a class? can you have a default __repr__ of a class?
    phone: str


EntryDefinition = dict[str, list[PosDefinition]]


class Token(TypedDict):
    index: int
    word: str
    originalText: str
    characterOffsetBegin: int
    characterOffsetEnd: int
    pos: str  # FIXME: make this an ENUM


class RichToken(Token):
    phone: List[str]
    id: int
    np: str  # FIXME: "normalised POS", make this an ENUM
    bg: PosDefinition  # Best Guess


class SlimToken(TypedDict):
    phone: List[str]
    id: int
    np: str  # FIXME: "normalised POS", make this an ENUM
    bg: PosDefinition  # Best Guess

    # FIXME: ??? is this here
    pos: str  # FIXME: make this an ENUM


AnyToken = Union[Token, SlimToken, RichToken]


class Sentence(TypedDict):
    index: int
    tokens: List[Token]
    # added
    os: str
    l1: str


class Model(TypedDict):
    sentences: List[Sentence]
