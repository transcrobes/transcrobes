#!/bin/bash
set -e

TAG=${TRANSCROBES_BUILD_TAG:-$(git describe --tags)}
MAIN_IMAGE=${TRANSCROBES_DOCKER_REPO}/transcrobes:$TAG
ENVIRONMENT=${ENVIRONMENT:-prod}

SCRIPT_DIR=$(dirname "$(readlink -f "$0")")
BASE_DIR=$(dirname $SCRIPT_DIR)

echo "Building image ${MAIN_IMAGE} with context $BASE_DIR with docker file $BASE_DIR/Dockerfile"

docker build $BASE_DIR -f $BASE_DIR/Dockerfile -t ${MAIN_IMAGE} --build-arg ENVIRONMENT=${ENVIRONMENT}
