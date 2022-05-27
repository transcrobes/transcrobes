# -*- coding: utf-8 -*-

from __future__ import annotations

from typing import List, Optional

from app.worker.faustus import UserDayT, UserWordT
from faust import Record


class BaseEvent(Record, validation=True):  # pylint: disable=W0223
    type: str
    source: str
    user_id: str
    user_stats_mode: int


class ActionEvent(BaseEvent):  # pylint: disable=W0223  # bc_word_lookup, bc_sentence_lookup
    target_word: str
    target_sentence: Optional[str]


class VocabEvent(BaseEvent, validation=True):  # pylint: disable=W0223  # bulk_vocab
    data: dict[str, List[int]]


class ReloadEvent(BaseEvent, validation=True):  # pylint: disable=W0223  # reload
    words: dict[str, UserWordT] = {}
    days: dict[int, UserDayT] = {}


class CardEvent(BaseEvent):  # pylint: disable=W0223  # token_details_card
    target_word: str
    grade: int
    pos: str
    source_sentence: str
