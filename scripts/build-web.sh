#!/bin/bash
set -e

TAG=${TRANSCROBES_BUILD_TAG:-$(git describe --tags)}
MAIN_IMAGE=${TRANSCROBES_DOCKER_REPO}/transcrobes-web:$TAG
LATEST_IMAGE=${TRANSCROBES_DOCKER_REPO}/transcrobes-web:latest
ENVIRONMENT=${ENVIRONMENT:-prod}

SCRIPT_DIR=$(dirname "$(readlink -f "$0")")
BASE_DIR=$(dirname $SCRIPT_DIR)

echo "Building image ${MAIN_IMAGE} with context $BASE_DIR with docker file $BASE_DIR/Dockerfile"

docker build $BASE_DIR -f $BASE_DIR/Dockerfile.web -t ${MAIN_IMAGE} -t ${LATEST_IMAGE} \
  --build-arg ENVIRONMENT=${ENVIRONMENT} \
  --build-arg TRANSCROBES_BACKEND_IMAGE_TAG=${TRANSCROBES_BACKEND_IMAGE_TAG} \
  --build-arg TRANSCROBES_DOCKER_REPO=${TRANSCROBES_DOCKER_REPO} \
  --build-arg NPM_OVERRIDE=${NPM_OVERRIDE}
