#! /usr/bin/env bash

# Let the DB start
python /app/app/python_pre_start.py
python /app/app/python_pre_start_stats.py

# Run migrations
alembic -c alembic.main.ini upgrade head

alembic -c alembic.stats.ini upgrade head

# Create initial data in DB
python /app/app/initial_data.py
