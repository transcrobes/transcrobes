#!/bin/bash

export APPNAME=transcrobes
export NAMESPACE=transcrobes
# export PROJECTS="backend frontend backups"
export PROJECTS="backend frontend"

export ENVIRONMENT=${ENVIRONMENT:-prod}
export LOCALHOST_NAME=${APPNAME}.localhost
export TLS_SECRET_NAME=${APPNAME}-${APPNAME}-cert
export KUBECONFIG=~/.kube/config.k3d
export CONTAINER_USER_ID=1001
export GIT_VERSION=$(git describe --tags)
export LOCAL_REGISTRY_PORT=5111
export LOCAL_REGISTRY_NAME=k3d-registry.localhost
export LOCAL_REGISTRY=${LOCAL_REGISTRY_NAME}:${LOCAL_REGISTRY_PORT}

export TRANSCROBES_DOCKER_REPO=${LOCAL_REGISTRY}/${NAMESPACE}
