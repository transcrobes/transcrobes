#!/bin/bash

set -e

if [ -n "$(git status --porcelain)" ]; then
  echo "Please ensure there are no changes or untracked files before rebuilding"
  exit 1
fi

SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
source ${SCRIPT_DIR}/vars.sh

[[ ! -z $(k3d cluster list ${APPNAME} | grep '0/1') ]] && k3d cluster stop --all && k3d cluster start ${APPNAME}

kubectl config use-context k3d-${APPNAME}

# Delete the images on the node - not the registry!
# docker exec k3d-transcrobes-server-0 sh -c 'ctr image rm $(ctr image list -q)'

TAG=${TRANSCROBES_BUILD_TAG:-${GIT_VERSION}}
TRANSCROBES_BACKEND_IMAGE_TAG=${TRANSCROBES_BACKEND_IMAGE_TAG:-${GIT_VERSION}}

for project in ${PROJECTS}; do
  echo "Building image with context ${SCRIPT_DIR}/${project} with docker file ${SCRIPT_DIR}/${project}/Dockerfile"
  FULL_TAG=${LOCAL_REGISTRY}/${APPNAME}/${APPNAME}-${project}:${TAG}

  docker build ${SCRIPT_DIR}/${project} --network host -f ${SCRIPT_DIR}/${project}/Dockerfile \
    -t ${FULL_TAG} \
    --build-arg ENVIRONMENT=${ENVIRONMENT} \
    --build-arg TRANSCROBES_BACKEND_IMAGE_TAG=${TRANSCROBES_BACKEND_IMAGE_TAG} \
    --build-arg TRANSCROBES_DOCKER_REPO=${TRANSCROBES_DOCKER_REPO} \
    --build-arg NPM_OVERRIDE=${NPM_OVERRIDE} \
    --build-arg PIP_OVERRIDE=${PIP_OVERRIDE} \
    --build-arg SOURCES_OVERRIDE=${SOURCES_OVERRIDE} \
    --build-arg GIT_VERSION=${GIT_VERSION}

  docker push ${FULL_TAG}
done

helm upgrade --install ${APPNAME} \
  ${HOME}/dev/ntc/transcrobes/kube/chart/${APPNAME}/ --namespace ${NAMESPACE} \
  --set transcrobes.image.tag="${GIT_VERSION}" \
  --set faustworker.image.tag="${GIT_VERSION}" \
  --set sworker.image.tag="${GIT_VERSION}" \
  --debug -f ${HOME}/dev/ntc/transcrobes/kube/k3d-deploy/overrides-dev.yaml
  # --set transcrobes.backups.image.tag="${GIT_VERSION}" \
