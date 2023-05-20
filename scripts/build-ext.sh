#!/bin/bash
set -e

VITE_GIT_VERSION=$(git describe --tags)
TAG=${TRANSCROBES_BUILD_TAG:-${VITE_GIT_VERSION}}
MAIN_IMAGE=${TRANSCROBES_DOCKER_REPO}/transcrobes-ext:$TAG

SCRIPT_DIR=$(dirname "$(readlink -f "$0")")
BASE_DIR=$(dirname $SCRIPT_DIR)

docker build $BASE_DIR/frontend --network host  -f $BASE_DIR/frontend/ext.dockerfile -t ${MAIN_IMAGE}

docker create -ti --name dummy $MAIN_IMAGE bash
docker cp dummy:/app/extbuild $BASE_DIR/dist
docker rm -f dummy
