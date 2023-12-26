#!/bin/bash

set -e

[ -z "$TRANSCROBES_BUILD_GIT_TOKEN" ] && echo "Need to set TRANSCROBES_BUILD_GIT_TOKEN" && exit 1;
[ -z "$TRANSCROBES_BUILD_GIT_REPO_NAME" ] && echo "Need to set TRANSCROBES_BUILD_GIT_REPO_NAME" && exit 1;
[ -z "$TRANSCROBES_BUILD_GIT_ORG_NAME" ] && echo "Need to set TRANSCROBES_BUILD_GIT_ORG_NAME" && exit 1;
[ -z "$TRANSCROBES_BUILD_NAMESPACE" ] && echo "Need to set TRANSCROBES_BUILD_NAMESPACE" && exit 1;

[ -z "$TRANSCROBES_BUILD_REF" ] && echo "Need to set TRANSCROBES_BUILD_REF" && exit 1;
[ -z "$TRANSCROBES_BUILD_DEPLOY_TAG" ] && echo "Need to set TRANSCROBES_BUILD_DEPLOY_TAG" && exit 1;

export TRANSCROBES_BUILD_KUBECONFIG="${TRANSCROBES_BUILD_KUBECONFIG:-${HOME}/.kube/config.transcrob.es}"
export TRANSCROBES_BUILD_REGISTRY="${TRANSCROBES_BUILD_REGISTRY:-registry.transcrob.es}"
export TRANSCROBES_BUILD_DOCKERFILE_PATH="${TRANSCROBES_BUILD_DOCKERFILE_PATH:-Dockerfile}"
export TRANSCROBES_BUILD_SECRET_NAME="${TRANSCROBES_BUILD_SECRET_NAME:-tcrobot}"

export TRANSCROBES_BUILD_REPO_NAME="${TRANSCROBES_BUILD_GIT_REPO_NAME}"

export TRANSCROBES_BACKEND_IMAGE_TAG=${TRANSCROBES_BACKEND_IMAGE_TAG:-${GIT_VERSION}}
export TRANSCROBES_DOCKER_REPO=${TRANSCROBES_BUILD_REGISTRY}/transcrobes

if [ ! -z "$TRANSCROBES_BUILD_SUBDIRECTORY" ]; then
    export TRANSCROBES_BUILD_REPO_NAME="${TRANSCROBES_BUILD_REPO_NAME}-${TRANSCROBES_BUILD_SUBDIRECTORY}"
fi

COMBINED=$(cat <<-END
{
    "spec": {
        "containers": [
            {
                "name": "kaniko-build-${TRANSCROBES_BUILD_REPO_NAME}",
                "image": "gcr.io/kaniko-project/executor:latest",
                "args": ["--dockerfile=${TRANSCROBES_BUILD_DOCKERFILE_PATH}",
                        "--compressed-caching=false",
                        "--context-sub-path=${TRANSCROBES_BUILD_SUBDIRECTORY}",
                        "--context=git://${TRANSCROBES_BUILD_GIT_TOKEN}@github.com/${TRANSCROBES_BUILD_GIT_ORG_NAME}/${TRANSCROBES_BUILD_GIT_REPO_NAME}.git#refs/${TRANSCROBES_BUILD_REF}",
                        "--destination=${TRANSCROBES_DOCKER_REPO}/${TRANSCROBES_BUILD_REPO_NAME}:${TRANSCROBES_BUILD_DEPLOY_TAG}",
                        "--build-arg=TRANSCROBES_DOCKER_REPO=${TRANSCROBES_DOCKER_REPO}",
                        "--build-arg=TRANSCROBES_BACKEND_IMAGE_TAG=${TRANSCROBES_BUILD_DEPLOY_TAG}",
                        "--build-arg=GIT_VERSION=${TRANSCROBES_BUILD_DEPLOY_TAG}"],
                "volumeMounts": [
                    {
                        "mountPath": "/kaniko/.docker",
                        "name": "kaniko-secret"
                    }
                ]
            }
        ],
        "volumes": [
            {
                "name": "kaniko-secret",
                "secret": {
                    "secretName": "${TRANSCROBES_BUILD_SECRET_NAME}",
                    "items": [
                        {
                            "key": ".dockerconfigjson",
                            "path": "config.json"
                        }
                    ]
                }
            }
        ]
    }
}
END

)

echo "Combined:"

echo $COMBINED

KUBECONFIG=${TRANSCROBES_BUILD_KUBECONFIG} kubectl delete -n $TRANSCROBES_BUILD_NAMESPACE --ignore-not-found=true --force pod kaniko-build-${TRANSCROBES_BUILD_REPO_NAME}

KUBECONFIG=${TRANSCROBES_BUILD_KUBECONFIG} kubectl run -n $TRANSCROBES_BUILD_NAMESPACE kaniko-build-${TRANSCROBES_BUILD_REPO_NAME} --image gcr.io/kaniko-project/executor:latest --restart=Never --overrides="${COMBINED}"

KUBECONFIG=${TRANSCROBES_BUILD_KUBECONFIG} kubectl wait -n $TRANSCROBES_BUILD_NAMESPACE --for=condition=Ready pod/kaniko-build-${TRANSCROBES_BUILD_REPO_NAME}

KUBECONFIG=${TRANSCROBES_BUILD_KUBECONFIG} kubectl logs -n $TRANSCROBES_BUILD_NAMESPACE kaniko-build-${TRANSCROBES_BUILD_REPO_NAME} -f

KUBECONFIG=${TRANSCROBES_BUILD_KUBECONFIG} kubectl delete -n $TRANSCROBES_BUILD_NAMESPACE --ignore-not-found=true --force pod kaniko-build-${TRANSCROBES_BUILD_REPO_NAME}
