#!/bin/bash
set -e

TAG=${TRANSCROBES_BUILD_TAG:-$(git describe --tags)}
MAIN_IMAGE=${TRANSCROBES_DOCKER_REPO}/transcrobes-sworker:$TAG

SCRIPT_DIR=$(dirname "$(readlink -f "$0")")
BASE_DIR=$(dirname $SCRIPT_DIR)

echo $BASE_DIR

docker build $BASE_DIR --network host -f $BASE_DIR/Dockerfile.sworker -t ${MAIN_IMAGE} \
  --build-arg ENVIRONMENT=${ENVIRONMENT} \
  --build-arg TRANSCROBES_DOCKER_REPO=${TRANSCROBES_DOCKER_REPO}
