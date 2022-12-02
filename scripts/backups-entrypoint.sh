#!/bin/bash -e

# Script to backup every X minutes/hours, cleaning files older than DAYS_TO_KEEP_HOURLY days
# A daily backup is made and deleted every DAYS_TO_KEEP_DAILY

export PGHOST=${PGHOST:-postgres}
export PGPORT=${PGPORT:-5432}
export PGUSER=${PGUSER:-postgres}
export DATABASE=${PGDATABASE:-transcrobes}
: ${PGPASSWORD:?"--password to a PostgreSQL container or server is not set"}

export BACKUPS_DATABASE_PATH=${BACKUPS_DATABASE_PATH:-/opt/backups/data}
export BACKUPS_MEDIA_PATH=${BACKUPS_MEDIA_PATH:-/opt/backups/media}
export DATA_ROOT=${DATA_ROOT:-/opt/backups}
export MEDIA_ROOT=${MEDIA_ROOT:-/opt/transcrobes/media}
export DAYS_TO_KEEP_HOURLY=${DAYS_TO_KEEP_HOURLY:-1}
export DAYS_TO_KEEP_DAILY=${DAYS_TO_KEEP_DAILY:-90}

# Ensure backup paths exist
mkdir -p ${BACKUPS_DATABASE_PATH}
mkdir -p ${BACKUPS_MEDIA_PATH}

XZ_COMPRESSION_LEVEL=${XZ_COMPRESSION_LEVEL:-7}

################################################################################
# SQL backup
DAILY_ARCHIVE="db-archive-$(date +"%Y-%m-%d").sql"

if [[ -f "${BACKUPS_DATABASE_PATH}/$DAILY_ARCHIVE.xz" ]]; then
  ARCHIVE="db-archive-$(date +"%Y-%m-%d_%H-%M").sql"
  echo "Daily database archive $DAILY_ARCHIVE.xz exists, performing hourly backup $ARCHIVE"
else
  ARCHIVE="$DAILY_ARCHIVE"
  echo "Daily database archive $DAILY_ARCHIVE.xz doesn't exist, performing daily backup"
fi

echo "Cleaning obsolete hourly database files"
export OBSOLETE_FILES='db-archive-????-??-??_??-??.sql.xz'
find $BACKUPS_DATABASE_PATH -name $OBSOLETE_FILES -type f -mtime "+$DAYS_TO_KEEP_HOURLY" -delete

echo "Cleaning obsolete daily database files"
export OBSOLETE_FILES='db-archive-????-??-??.sql.xz'
find $BACKUPS_DATABASE_PATH -name $OBSOLETE_FILES -type f -mtime "+$DAYS_TO_KEEP_DAILY" -delete

echo "Set backup file name to: $ARCHIVE with xz compression level $XZ_COMPRESSION_LEVEL"
echo "Starting database backup..."
pg_dump -c --dbname=$DATABASE  > $ARCHIVE
echo "Database backup dumped, compressing with 'xz -T4 -${XZ_COMPRESSION_LEVEL} -zf $ARCHIVE'"
xz -T4 -${XZ_COMPRESSION_LEVEL} -zf "$ARCHIVE"
echo "Archive $ARCHIVE compressed, moving to ${BACKUPS_DATABASE_PATH}/$ARCHIVE.xz"
mv "$ARCHIVE.xz" "${BACKUPS_DATABASE_PATH}/$ARCHIVE.xz"
echo "Finished backing up $ARCHIVE"

################################################################################
# Stats SQL backup
: ${STATS_PGPASSWORD:?"--password to a PostgreSQL container or server is not set"}
export PGHOST=${STATS_PGHOST:-postgres}
export PGPORT=${STATS_PGPORT:-5432}
export PGUSER=${STATS_PGUSER:-postgres}
export PGPASSWORD=${STATS_PGPASSWORD:-postgres}
export DATABASE=${STATS_PGDATABASE:-transcrobes}

DAILY_ARCHIVE="statsdb-archive-$(date +"%Y-%m-%d").sql"

if [[ -f "${BACKUPS_DATABASE_PATH}/$DAILY_ARCHIVE.xz" ]]; then
  ARCHIVE="statsdb-archive-$(date +"%Y-%m-%d_%H-%M").sql"
  echo "Daily database archive $DAILY_ARCHIVE.xz exists, performing hourly backup $ARCHIVE"
else
  ARCHIVE="$DAILY_ARCHIVE"
  echo "Daily database archive $DAILY_ARCHIVE.xz doesn't exist, performing daily backup"
fi

echo "Cleaning obsolete hourly database files"
export OBSOLETE_FILES='statsdb-archive-????-??-??_??-??.sql.xz'
find $BACKUPS_DATABASE_PATH -name $OBSOLETE_FILES -type f -mtime "+$DAYS_TO_KEEP_HOURLY" -delete

echo "Cleaning obsolete daily database files"
export OBSOLETE_FILES='statsdb-archive-????-??-??.sql.xz'
find $BACKUPS_DATABASE_PATH -name $OBSOLETE_FILES -type f -mtime "+$DAYS_TO_KEEP_DAILY" -delete

echo "Set backup file name to: $ARCHIVE with xz compression level $XZ_COMPRESSION_LEVEL"
echo "Starting database backup..."
pg_dump -c --dbname=$DATABASE  > $ARCHIVE
echo "Database backup dumped, compressing with 'xz -T4 -${XZ_COMPRESSION_LEVEL} -zf $ARCHIVE'"
xz -T4 -${XZ_COMPRESSION_LEVEL} -zf "$ARCHIVE"
echo "Archive $ARCHIVE compressed, moving to ${BACKUPS_DATABASE_PATH}/$ARCHIVE.xz"
mv "$ARCHIVE.xz" "${BACKUPS_DATABASE_PATH}/$ARCHIVE.xz"
echo "Finished backing up $ARCHIVE"

################################################################################
# Media backup
DAILY_ARCHIVE="media-$(date +"%Y-%m-%d").tar"

if [[ -f "${BACKUPS_MEDIA_PATH}/$DAILY_ARCHIVE.xz" ]]; then
  ARCHIVE="media-$(date +"%Y-%m-%d_%H-%M").tar"
  echo "Daily media archive $DAILY_ARCHIVE.xz exists, performing hourly backup $ARCHIVE"
else
  ARCHIVE="$DAILY_ARCHIVE"
  echo "Daily media archive $DAILY_ARCHIVE.xz doesn't exist, performing daily backup"
fi

echo "Cleaning obsolete hourly media files"
export OBSOLETE_FILES='media-????-??-??_??-??.tar.xz'
find $BACKUPS_MEDIA_PATH -name $OBSOLETE_FILES -type f -mtime "+$DAYS_TO_KEEP_HOURLY" -delete

echo "Cleaning obsolete daily media files"
export OBSOLETE_FILES='media-????-??-??.tar.xz'
find $BACKUPS_MEDIA_PATH -name $OBSOLETE_FILES -type f -mtime "+$DAYS_TO_KEEP_DAILY" -delete

if compgen -G $MEDIA_ROOT/user_* > /dev/null; then
  echo "Set backup file name to: $ARCHIVE with xz compression level $XZ_COMPRESSION_LEVEL"
  echo "Starting media files backup..."
  tar cf "$ARCHIVE" $MEDIA_ROOT/user_*
  echo "Media files tarred, compressing with 'xz -T4 -${XZ_COMPRESSION_LEVEL} -zf $ARCHIVE'"
  xz -T4 -${XZ_COMPRESSION_LEVEL} -zf $ARCHIVE
  echo "Archive $ARCHIVE compressed, moving to ${BACKUPS_MEDIA_PATH}/$ARCHIVE.xz"
  mv "$ARCHIVE.xz" "${BACKUPS_MEDIA_PATH}/$ARCHIVE.xz"
else
  echo "No user media files found, skipping media backup"
fi
echo "Finished backing up $ARCHIVE"

if [ ! -z $BACKUPS_SSH_KEY_PATH ]; then
  echo "Syncing media to $BACKUPS_SSH_USER@$BACKUPS_SSH_HOST:$BACKUPS_SSH_REMOTE_PATH"
  rsync -ahe "ssh -o 'StrictHostKeyChecking no' -i ${BACKUPS_SSH_KEY_PATH} -p ${BACKUPS_SSH_PORT}" ${BACKUPS_MEDIA_PATH} "$BACKUPS_SSH_USER@$BACKUPS_SSH_HOST:$BACKUPS_SSH_REMOTE_PATH" $BACKUPS_SSH_RSYNC_OPTIONS
  echo "Syncing database to $BACKUPS_SSH_USER@$BACKUPS_SSH_HOST:$BACKUPS_SSH_REMOTE_PATH"
  rsync -ahe "ssh -o 'StrictHostKeyChecking no' -i ${BACKUPS_SSH_KEY_PATH} -p ${BACKUPS_SSH_PORT}" ${BACKUPS_DATABASE_PATH} "$BACKUPS_SSH_USER@$BACKUPS_SSH_HOST:$BACKUPS_SSH_REMOTE_PATH" $BACKUPS_SSH_RSYNC_OPTIONS
fi

echo "Backup finished!"
