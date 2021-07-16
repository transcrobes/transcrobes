#! /usr/bin/env bash
set -e

python /app/app/python_pre_start.py

faust -A app.fworker worker -l info --web-port $FAUST_PORT
