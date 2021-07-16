#! /usr/bin/env bash
# set -e
set -o allexport
. ../../.env
. .env   # override with non-docker, local versions
set +o allexport

export PORT=8080
export HOST=127.0.0.1

poetry run gunicorn -k "uvicorn.workers.UvicornWorker" -c "gunicorn_conf.py" "app.main"
