#!/bin/bash
set -e

# TAG=${TAG?Variable not set} \
# FRONTEND_ENV=${FRONTEND_ENV-production} \
# docker-compose \
# -f docker-compose.yml \
# build

TAG=${TRANSCROBES_BUILD_TAG:-$(git describe --tags)}
MAIN_IMAGE=${TRANSCROBES_DOCKER_REPO}/transcrobes:$TAG

SCRIPT_DIR=$(dirname "$(readlink -f "$0")")
BASE_DIR=$(dirname $SCRIPT_DIR)

echo "Building image ${MAIN_IMAGE} with context $BASE_DIR with docker file $BASE_DIR/Dockerfile"

docker build $BASE_DIR -f $BASE_DIR/Dockerfile -t ${MAIN_IMAGE}

# if [ -z "$TRANSCROBES_SKIP_JS_COMPILE" ]
# then
#   npm run prod
#   npm run mediap
#   npm run readiump
# else
#       echo "\$TRANSCROBES_SKIP_JS_COMPILE is NOT empty, skipped JS compilation"
# fi
# python3 src/manage.py collectstatic --noinput
# buildah bud --layers -t ${MAIN_IMAGE} -f images/main/Dockerfile .
# buildah push ${MAIN_IMAGE}
