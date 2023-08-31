#! /bin/bash

SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )

echo '---'
kubectl create namespace transcrobes

echo '---'
kubectl -n transcrobes delete secret secret-pg
echo '---'
kubectl -n transcrobes create secret generic secret-pg --from-env-file=${SCRIPT_DIR}/secrets/pg.env

echo '---'
kubectl -n transcrobes delete secret secret-transcrobes
echo '---'
kubectl -n transcrobes create secret generic secret-transcrobes --from-env-file=${SCRIPT_DIR}/secrets/app.env

LOCALHOST_NAME=transcrobes.localhost
TLS_SECRET_NAME=transcrobes-transcrobes-cert

echo '---'
kubectl -n transcrobes delete secret ${TLS_SECRET_NAME}
echo '---'
mkcert -install
mkcert -cert-file ${SCRIPT_DIR}/local-secrets/${LOCALHOST_NAME}.pem -key-file ${SCRIPT_DIR}/local-secrets/${LOCALHOST_NAME}-key.pem ${LOCALHOST_NAME}
kubectl -n transcrobes create secret tls ${TLS_SECRET_NAME} --key ${SCRIPT_DIR}/local-secrets/${LOCALHOST_NAME}-key.pem --cert ${SCRIPT_DIR}/local-secrets/${LOCALHOST_NAME}.pem
