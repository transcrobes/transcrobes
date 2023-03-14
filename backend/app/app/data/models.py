# -*- coding: utf-8 -*-
from __future__ import annotations

from enum import Enum

MANIFEST_JSON = "manifest.json"
PARSE_JSON_SUFFIX = ".parse.json"
ENRICH_JSON_SUFFIX = ".enrich.json"
DATA_JS_SUFFIX = ".data.js"
DATA_JSON_SUFFIX = ".data.json"
SRT_EXTENSION = ".srt"
VTT_EXTENSION = ".vtt"
ASS_EXTENSION = ".ass"
TTML_EXTENSION = ".xml"
CSV_EXTENSION = ".csv"
WEBVTT_FILE = "subtitles.vtt"


class ActivityTypes(Enum):
    DASHBOARD = 0
    EXTENSION = 1
    UNKNOWN = 2
    IMPORTS = 3
    NOTROBES = 4
    LISTROBES = 5
    DICTIONARIES = 6
    CLASSES = 7
    MYSTATS = 8
    STUDENTSTATS = 9
    EXPORTS = 10
    GOALS = 11
    LISTS = 12
    REPETROBES = 13
    TEXTCROBES = 14
    CONTENTS = 15
    CONTENTVIDEO = 16
    CONTENTEPUB = 17
    BROCROBES = 18
    SURVEYS = 19
    SETTINGS = 20
    HELP = 21


NONE = 0
REQUESTED = 1
PROCESSING = 2
FINISHED = 3
ERROR = 4

PROCESSING_STATUS = [
    (NONE, "None"),
    (REQUESTED, "Requested"),
    (PROCESSING, "Processing"),
    (FINISHED, "Finished"),
    (ERROR, "ERROR"),
]
