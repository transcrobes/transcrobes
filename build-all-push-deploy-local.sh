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
TRANSCROBES_BASE_IMAGE_TAG=${TRANSCROBES_BUILD_TAG:-${GIT_VERSION}}
TRANSCROBES_BACKEND_IMAGE_TAG=${TRANSCROBES_BACKEND_IMAGE_TAG:-${GIT_VERSION}}

for project in ${PROJECTS}; do
  MAIN_IMAGE=${TRANSCROBES_DOCKER_REPO}/${project}:$TAG
  echo "Building image ${MAIN_IMAGE} with context ${SCRIPT_DIR} with docker file ${SCRIPT_DIR}/Dockerfile.${project}"

  docker build ${SCRIPT_DIR} --network host -f $SCRIPT_DIR/Dockerfile.${project} \
    -t ${MAIN_IMAGE} -t ${LOCAL_REGISTRY}/${REPO}/${project}:${TAG}\
    --build-arg ENVIRONMENT=${ENVIRONMENT} \
    --build-arg TRANSCROBES_BASE_IMAGE_TAG=${TRANSCROBES_BASE_IMAGE_TAG} \
    --build-arg TRANSCROBES_BACKEND_IMAGE_TAG=${TRANSCROBES_BACKEND_IMAGE_TAG} \
    --build-arg TRANSCROBES_DOCKER_REPO=${TRANSCROBES_DOCKER_REPO} \
    --build-arg NPM_OVERRIDE=${NPM_OVERRIDE} \
    --build-arg PIP_OVERRIDE=${PIP_OVERRIDE} \
    --build-arg SOURCES_OVERRIDE=${SOURCES_OVERRIDE} \
    --build-arg GIT_VERSION=${GIT_VERSION}

  docker push ${LOCAL_REGISTRY}/${REPO}/${project}:${TAG}
done

HELM_COMMAND=$(cat <<- END
helm upgrade --install ${APPNAME} \
  ${SCRIPT_DIR}/kube/chart/${APPNAME}/ --namespace ${APPNAME} --create-namespace \
  --debug -f ${SCRIPT_DIR}/kube/k3d-deploy/overrides-dev.yaml \
  $(if [ -f "${SCRIPT_DIR}/tmp/overrides-dev.yaml" ]; then echo " -f ${SCRIPT_DIR}/tmp/overrides-dev.yaml"; fi)
END
)

for project in ${PROJECTS}; do
  HELM_COMMAND+=" --set ${project}.image.tag=${TAG}"
done

exec ${HELM_COMMAND}
