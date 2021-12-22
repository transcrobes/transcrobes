#! /usr/bin/env sh
set -e

DEFAULT_MODULE_NAME=app.main

MODULE_NAME=${MODULE_NAME:-$DEFAULT_MODULE_NAME}
VARIABLE_NAME=${VARIABLE_NAME:-app}
export APP_MODULE=${APP_MODULE:-"$MODULE_NAME:$VARIABLE_NAME"}

HOST=${LISTEN_ADDRESS:-0.0.0.0}
PORT=${LISTEN_PORT:-8000}
LOG_LEVEL=${LOG_LEVEL:-info}

PRE_START_PATH=${PRE_START_PATH:-/app/prestart.sh}
. "$PRE_START_PATH"

# Start Uvicorn with live reload
exec uvicorn --reload --host $HOST --port $PORT --log-level $LOG_LEVEL "$APP_MODULE"
