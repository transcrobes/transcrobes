#!/bin/bash

export PYTHONPATH=.

set -o allexport
. ../../.env
. .env
set +o allexport

poetry run python tmp/$1
