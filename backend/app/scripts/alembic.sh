#!/bin/bash

export PYTHONPATH=.

set -o allexport
. .env
set +o allexport

if [ "$1" == "migrate" ];
then
  poetry run alembic upgrade head
elif [ "$1" == "makemigrations" ];
then
  poetry run alembic revision --autogenerate -m "$2"
else
  echo "Unsupport operation"
  exit 1
fi
