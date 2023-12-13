#! /bin/bash

SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
source ${SCRIPT_DIR}/../../vars.sh


mkdir -p ${SCRIPT_DIR}/volumes

if [ -n "$(git status --porcelain)" ]; then
  echo "Please ensure there are no changes or untracked files before installing"
  exit 1
fi

# create the k3d registry if not present
if [ -z "$(k3d registry list | grep ${LOCAL_REGISTRY_NAME})" ];
then
  k3d registry create registry.localhost --port 0.0.0.0:$LOCAL_REGISTRY_PORT
fi

# make sure no other cluster is running
k3d cluster stop --all

k3d cluster create ${APPNAME} --config ${SCRIPT_DIR}/k3d-config.yml \
  --volume ${SCRIPT_DIR}/volumes:/opt/transcrobes/volumes@all \
  --volume ${SCRIPT_DIR}/../../backend/app:/src@all \
  --volume ${SCRIPT_DIR}/traefik-config.yaml:/var/lib/rancher/k3s/server/manifests/traefik-config.yaml

# for i in $PROJECTS; do
#   docker pull ${REGISTRY_NAME}/${REPO}/${i}:${GIT_VERSION}
#   docker tag ${REGISTRY_NAME}/${REPO}/${i}:${GIT_VERSION} ${LOCAL_REGISTRY}/${REPO}/${i}:${GIT_VERSION}
#   docker push ${LOCAL_REGISTRY}/${REPO}/${i}:${GIT_VERSION}
# done

mkdir -p ~/.kube
k3d kubeconfig merge ${APPNAME} --output ${KUBECONFIG}
kubectl --kubeconfig ${KUBECONFIG} config set-context k3d-${APPNAME} --namespace=${APPNAME}
