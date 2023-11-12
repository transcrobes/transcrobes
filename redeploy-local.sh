#!/bin/bash

set -e

SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
source ${SCRIPT_DIR}/vars.sh

# Delete the images on the node - not the registry!
# docker exec k3d-transcrobes-server-0 sh -c 'ctr image rm $(ctr image list -q)'

TAG=${TRANSCROBES_BUILD_TAG:-${GIT_VERSION}}
HELM_COMMAND=$(cat <<- END
helm upgrade --install ${APPNAME} \
  ${SCRIPT_DIR}/kube/chart/${APPNAME}/ --namespace ${APPNAME} --create-namespace \
  -f ${SCRIPT_DIR}/kube/k3d-deploy/overrides-dev.yaml \
  $(if [ -f "${SCRIPT_DIR}/tmp/overrides-dev.yaml" ]; then echo " -f ${SCRIPT_DIR}/tmp/overrides-dev.yaml"; fi)
END
)

for project in ${PROJECTS}; do
  HELM_COMMAND+=" --set ${project}.image.tag=${TAG}"
done

echo "${HELM_COMMAND}"

exec ${HELM_COMMAND}
