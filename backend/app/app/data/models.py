# -*- coding: utf-8 -*-
from __future__ import annotations

MANIFEST_JSON = "manifest.json"
PARSE_JSON_SUFFIX = ".parse.json"
ENRICH_JSON_SUFFIX = ".enrich.json"
DATA_JS_SUFFIX = ".data.js"
DATA_JSON_SUFFIX = ".data.json"
SRT_EXTENTION = ".srt"
VTT_EXTENTION = ".vtt"
CSV_EXTENTION = ".csv"
WEBVTT_FILE = "subtitles.vtt"

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
