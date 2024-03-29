ARG TRANSCROBES_DOCKER_REPO
ARG TRANSCROBES_BACKEND_IMAGE_TAG
# Stage 0, "build-stage", based on Node.js, to build and compile the frontend
FROM node:20 as build-stage
ARG GIT_VERSION
ARG ENVIRONMENT=prod

LABEL maintainer="Anton Melser <anton@transcrob.es>"

ENV npm_config_registry=$NPM_OVERRIDE
ENV http_proxy=$http_proxy
ENV https_proxy=$https_proxy
ENV VITE_GIT_VERSION=$GIT_VERSION
ENV PUPPETEER_SKIP_DOWNLOAD=true

WORKDIR /app
COPY ./package*.json /app/

RUN npm config set proxy $http_proxy
RUN npm config set https-proxy $https_proxy
RUN --mount=type=cache,target=/root/.npm npm install --loglevel silly

COPY ./ /app/

RUN npm run build:${ENVIRONMENT}

FROM ${TRANSCROBES_DOCKER_REPO:-transcrobes}/transcrobes-backend:${TRANSCROBES_BACKEND_IMAGE_TAG:-$GIT_VERSION}
COPY --from=build-stage /app/dist /fapp

CMD ["/bin/bash", "/start-uvicorn.sh"]
