#! /usr/bin/env bash
set -e

python /app/app/python_pre_start_stats.py

python /app/app/sworker.py
