#!/bin/bash

set -e

SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
source ${SCRIPT_DIR}/vars.sh

if [ -n "$(git status --porcelain)" ]; then
  echo "Please ensure there are no changes or untracked files before rebuilding"
  exit 1
fi

SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
source ${SCRIPT_DIR}/vars.sh

TAG=${TRANSCROBES_BUILD_TAG:-${GIT_VERSION}}
TRANSCROBES_BASE_IMAGE_TAG=${TRANSCROBES_BUILD_TAG:-${GIT_VERSION}}
TRANSCROBES_BACKEND_IMAGE_TAG=${TRANSCROBES_BACKEND_IMAGE_TAG:-${GIT_VERSION}}

for project in $PROJECTS ; do
  MAIN_IMAGE=${TRANSCROBES_DOCKER_REPO}/${project}:$TAG
  echo "Building image ${MAIN_IMAGE} with context ${SCRIPT_DIR} with docker file ${SCRIPT_DIR}/Dockerfile.${project}"

  docker build ${SCRIPT_DIR} --network host -f $SCRIPT_DIR/Dockerfile.${project} \
    -t ${MAIN_IMAGE} -t ${LOCAL_REGISTRY}/${REPO}/${project}:${TAG} \
    --build-arg ENVIRONMENT=${ENVIRONMENT} \
    --build-arg TRANSCROBES_BASE_IMAGE_TAG=${TRANSCROBES_BASE_IMAGE_TAG} \
    --build-arg TRANSCROBES_BACKEND_IMAGE_TAG=${TRANSCROBES_BACKEND_IMAGE_TAG} \
    --build-arg TRANSCROBES_DOCKER_REPO=${TRANSCROBES_DOCKER_REPO} \
    --build-arg NPM_OVERRIDE=${NPM_OVERRIDE} \
    --build-arg PIP_OVERRIDE=${PIP_OVERRIDE} \
    --build-arg SOURCES_OVERRIDE=${SOURCES_OVERRIDE} \
    --build-arg GIT_VERSION=${GIT_VERSION}

  docker push ${MAIN_IMAGE}
done
