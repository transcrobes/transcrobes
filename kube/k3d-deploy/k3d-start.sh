#! /bin/bash

SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )

mkdir -p ${SCRIPT_DIR}/volumes

k3d cluster create transcrobes --config ${SCRIPT_DIR}/k3d-config.yml \
  --volume ${SCRIPT_DIR}/volumes:/opt/transcrobes/volumes@all \
  --volume ${SCRIPT_DIR}/../../backend/app:/src@all \
  --volume ${SCRIPT_DIR}/traefik-config.yaml:/var/lib/rancher/k3s/server/manifests/traefik-config.yaml
