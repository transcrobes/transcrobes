#!/bin/bash
set -e

TAG=${TRANSCROBES_BUILD_TAG:-$(git describe --tags)}
MAIN_IMAGE=${TRANSCROBES_DOCKER_REPO}/transcrobes-backups:$TAG
# SOURCES_OVERRIDE http://ftp.cn.debian.org/debian/ for China

SCRIPT_DIR=$(dirname "$(readlink -f "$0")")
BASE_DIR=$(dirname $SCRIPT_DIR)

echo $BASE_DIR

docker build $BASE_DIR -f $BASE_DIR/Dockerfile.backups -t ${MAIN_IMAGE} \
  --build-arg SOURCES_OVERRIDE=${SOURCES_OVERRIDE}
