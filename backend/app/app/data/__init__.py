# -*- coding: utf-8 -*-
from __future__ import annotations


def clean_broadcaster_string(original):
    return str(original).strip("'").strip('"')
