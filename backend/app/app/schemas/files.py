# -*- coding: utf-8 -*-

from __future__ import annotations

from faust import Record


class ProcessData(Record, serializer="json"):  # pylint: disable=W0223
    type: str
    id: str


# class ProcessQAG(Record, serializer="json"):  # pylint: disable=W0223
#     type: str
#     path: str
#     model_id: str
