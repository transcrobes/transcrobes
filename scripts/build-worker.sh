#!/bin/bash
set -e

VITE_GIT_VERSION=$(git describe --tags)
TAG=${TRANSCROBES_BUILD_TAG:-${VITE_GIT_VERSION}}
MAIN_IMAGE=${TRANSCROBES_DOCKER_REPO}/transcrobes-worker:$TAG
LATEST_IMAGE=${TRANSCROBES_DOCKER_REPO}/transcrobes-worker:latest

SCRIPT_DIR=$(dirname "$(readlink -f "$0")")
BASE_DIR=$(dirname $SCRIPT_DIR)

echo $BASE_DIR

docker build $BASE_DIR --network host -f $BASE_DIR/Dockerfile.worker -t ${MAIN_IMAGE} -t ${LATEST_IMAGE} \
  --build-arg ENVIRONMENT=${ENVIRONMENT} \
  --build-arg TRANSCROBES_DOCKER_REPO=${TRANSCROBES_DOCKER_REPO}
