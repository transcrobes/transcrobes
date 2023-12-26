#! /bin/bash

SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
source ${SCRIPT_DIR}/../../vars.sh

echo '---'
kubectl create namespace ${APPNAME}

LOCALHOST_NAME=${APPNAME}.localhost
TLS_SECRET_NAME=${APPNAME}-${APPNAME}-cert

echo '---'
kubectl -n ${APPNAME} delete secret ${TLS_SECRET_NAME} --ignore-not-found
echo '---'
mkcert -cert-file ${SCRIPT_DIR}/local-secrets/${LOCALHOST_NAME}.pem -key-file ${SCRIPT_DIR}/local-secrets/${LOCALHOST_NAME}-key.pem ${LOCALHOST_NAME}
kubectl -n ${APPNAME} create secret tls ${TLS_SECRET_NAME} --key ${SCRIPT_DIR}/local-secrets/${LOCALHOST_NAME}-key.pem --cert ${SCRIPT_DIR}/local-secrets/${LOCALHOST_NAME}.pem

echo '---'
kubectl -n ${APPNAME} apply -f ${SCRIPT_DIR}/
