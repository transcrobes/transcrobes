# -*- coding: utf-8 -*-

from __future__ import annotations

from faust import Record


class ProcessData(Record, serializer="json"):  # pylint: disable=W0223
    type: str
    id: str
