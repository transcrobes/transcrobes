FROM python:3.12.1-slim
LABEL maintainer="Anton Melser <anton@transcrob.es>"

WORKDIR /app/

ARG SOURCES_OVERRIDE=
ARG PIP_OVERRIDE=
ENV PIP_INDEX_URL=$PIP_OVERRIDE

RUN bash -c "if [ ! -z $SOURCES_OVERRIDE ] ; then echo 'deb $SOURCES_OVERRIDE bookworm main' > /etc/apt/sources.list; echo 'deb $SOURCES_OVERRIDE bookworm-updates main' >> /etc/apt/sources.list ; fi"
RUN bash -c "if [ ! -z $PIP_INDEX_URL ] ; then echo '[global]\nindex-url=$PIP_INDEX_URL' > /etc/pip.conf; fi"

RUN apt-get update && apt-get upgrade -y && apt-get install -y \
  libmagic1 git make build-essential wget curl libgflags-dev libsnappy-dev \
  zlib1g-dev libbz2-dev liblz4-dev libzstd-dev libmagic-dev \
  && apt-get -y clean \
  && rm -rf /var/lib/apt/lists/*

RUN /usr/local/bin/python -m pip install --upgrade pip setuptools

COPY ./app/pyproject.toml ./app/requirements.txt ./app/dev-requirements.txt /app/

# Allow installing dev dependencies to run tests
ARG INSTALL_DEV=false
RUN --mount=type=cache,mode=0755,target=/root/.cache/pip bash -c "if [ $INSTALL_DEV == 'true' ] ; then pip install -r dev-requirements.txt ; else pip install -r requirements.txt --use-deprecated=legacy-resolver ; fi"

RUN apt-get remove -y --purge \
  git make build-essential wget curl libgflags-dev libsnappy-dev \
  zlib1g-dev libbz2-dev liblz4-dev libzstd-dev libmagic-dev \
  && apt-get -y autoremove && apt-get -y clean \
  && rm -rf /var/lib/apt/lists/*

COPY ./app /app

COPY ./app/start-reload.sh ./app/start-uvicorn.sh ./app/fworker-start.sh \
  ./app/sworker-start.sh ./app/start.sh ./app/gunicorn_conf.py /
RUN chmod +x /start.sh /start-reload.sh /start-uvicorn.sh /sworker-start.sh /fworker-start.sh

ENV PYTHONPATH=/app
ENV PYTHONUNBUFFERED=1
