# K3D Deploy

Tested on Ubuntu 22.04.

## Install

Required:

- [k3d](https://k3d.io)
- [kubectl](https://kubernetes.io/docs/tasks/tools/install-kubectl-linux/)
- [docker](https://www.digitalocean.com/community/tutorials/how-to-install-and-use-docker-on-ubuntu-22-04)

Optional:

- [k9s](https://k9scli.io/)

## Imgages

Get images:

```sh
# k3d
docker pull rancher/k3s:v1.28.2-k3s1
docker pull ghcr.io/k3d-io/k3d-tools:5.6.0
docker pull ghcr.io/k3d-io/k3d-proxy:5.6.0
```

## Start

- Create cluster

```sh
k3d cluster create transcrobes --config k3d-config.yml
# check
kubectl cluster-info
```

- Create namespace

```sh
kubectl create namespace transcrobes
# check
kubectl get ns
```

- Create secrets

```sh
kubectl -n transcrobes create secret generic secret-pg --from-env-file=secrets/pg.env
kubectl -n transcrobes create secret generic secret-transcrobes --from-env-file=secrets/transcrobes.env
# check
kubectl -n transcrobes get secret
```

- Deploy

```sh
GIT_VERSION=$(git describe --tags); helm upgrade --install tck ~/dev/ntc/transcrobes/kube/chart/transcrobes/ --namespace transcrobes --create-namespace -f ~/dev/ntc/transcrobes/kube/k3d-deploy/overrides-dev.yaml --set transcrobes.image.tag=$GIT_VERSION --set faustworker.image.tag=$GIT_VERSION --set transcrobes.backups.image.tag=$GIT_VERSION --set sworker.image.tag=$GIT_VERSION
```

- Check out k3d containers:

```sh
❯ docker container list
CONTAINER ID   IMAGE                            COMMAND                  CREATED          STATUS          PORTS                                                                                                                                                                                              NAMES
4c7d8c4aded0   ghcr.io/k3d-io/k3d-proxy:5.5.1   "/bin/sh -c nginx-pr…"   11 minutes ago   Up 11 minutes   0.0.0.0:443->443/tcp, :::443->443/tcp, 0.0.0.0:8080->80/tcp, :::8080->80/tcp, 127.0.0.1:6445->6443/tcp, 0.0.0.0:9000->31000/tcp, :::9000->31000/tcp, 0.0.0.0:9001->31001/tcp, :::9001->31001/tcp   k3d-transcrobes-serverlb 904db2dfc826   rancher/k3s:v1.26.4-k3s1         "/bin/k3d-entrypoint…"   11 minutes ago   Up 11 minutes k3d-transcrobes-agent-0
09c5b6c830f7   rancher/k3s:v1.26.4-k3s1         "/bin/k3d-entrypoint…"   11 minutes ago   Up 11 minutes k3d-transcrobes-server-0
```

> **WARNING**:
> [k3d](https://k3d.io) is kube inside docker with a load balancer to access ingress and node ports.
> This inception-style nesting is disconcerting at first: Pay attention to the PORTS section for container `k3d-transcrobes-serverlb`.
> Recommendations:
>
> - Read the [k3d doc](https://k3d.io/v5.6.0/usage/configfile/) in particular section [Exposing Services](https://k3d.io/v5.6.0/usage/exposing_services/).
> - Note that any port accessible via your machine `http://localhost:[PORT]` must be exposed via the load balancer i.e. `k3d-transcrobes-serverlb`.
> - Note that the kube ingress exposes on port 80/443 for resp. HTTP/S.
>   Read the kube manifests i.e. `.yml` files to follow the ports from load balander to ingress to service to pod.
