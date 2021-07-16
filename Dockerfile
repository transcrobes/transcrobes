# Stage 0, "build-stage", based on Node.js, to build and compile the frontend
FROM node:16 as build-stage

WORKDIR /app

COPY ./frontend/package*.json /app/

RUN npm install --legacy-peer-deps

COPY ./frontend/ /app/

RUN npm run build:prod

# FROM registry.transcrob.es/transcrobes/fastapi-rocks:latest
FROM antonapetrov/uvicorn-gunicorn-fastapi:python3.9

WORKDIR /app/

# Install Poetry
RUN curl -sSL https://raw.githubusercontent.com/python-poetry/poetry/master/get-poetry.py | POETRY_HOME=/opt/poetry python && \
  cd /usr/local/bin && \
  ln -s /opt/poetry/bin/poetry && \
  poetry config virtualenvs.create false

RUN apt-get update \
  && apt-get install -y gcc make g++ libgflags-dev libsnappy-dev zlib1g-dev libbz2-dev liblz4-dev \
  libzstd-dev librocksdb-dev

# Copy poetry.lock* in case it doesn't exist in the repo
COPY ./backend/app/pyproject.toml ./backend/app/poetry.lock* /app/

# Allow installing dev dependencies to run tests
ARG INSTALL_DEV=false
RUN bash -c "if [ $INSTALL_DEV == 'true' ] ; then poetry install --no-root ; else poetry install --no-root --no-dev ; fi"

RUN apt-get remove -y --purge git libgflags-dev libsnappy-dev zlib1g-dev libbz2-dev liblz4-dev libzstd-dev

COPY ./backend/app /app
COPY --from=build-stage /app/dist /fapp
COPY ./backend/app/start-reload.sh /
COPY ./backend/app/start-uvicorn.sh /
ENV PYTHONPATH=/app
ENV PYTHONUNBUFFERED=1

CMD ["/bin/bash", "/start.sh"]
