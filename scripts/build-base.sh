#!/bin/bash
set -e

VITE_GIT_VERSION=$(git describe --tags)
TAG=${TRANSCROBES_BUILD_TAG:-${VITE_GIT_VERSION}}
MAIN_IMAGE=${TRANSCROBES_DOCKER_REPO}/transcrobes-base:$TAG
LATEST_IMAGE=${TRANSCROBES_DOCKER_REPO}/transcrobes-base:latest
ENVIRONMENT=${ENVIRONMENT:-prod}
# SOURCES_OVERRIDE http://ftp.cn.debian.org/debian/ for China

SCRIPT_DIR=$(dirname "$(readlink -f "$0")")
BASE_DIR=$(dirname $SCRIPT_DIR)

echo "Building image ${MAIN_IMAGE} with context $BASE_DIR with docker file $BASE_DIR/Dockerfile"

docker build $BASE_DIR --network host -f $BASE_DIR/Dockerfile.base -t ${MAIN_IMAGE} -t ${LATEST_IMAGE} \
  --build-arg ENVIRONMENT=${ENVIRONMENT} --build-arg SOURCES_OVERRIDE=${SOURCES_OVERRIDE} \
  --build-arg PIP_OVERRIDE=${PIP_OVERRIDE}
