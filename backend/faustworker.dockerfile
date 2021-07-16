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
COPY ./app/pyproject.toml ./app/poetry.lock* /app/

# Allow installing dev dependencies to run tests
ARG INSTALL_DEV=false
RUN bash -c "if [ $INSTALL_DEV == 'true' ] ; then poetry install --no-root ; else poetry install --no-root --no-dev ; fi"

RUN apt-get remove -y --purge git libgflags-dev libsnappy-dev zlib1g-dev libbz2-dev liblz4-dev libzstd-dev

ENV C_FORCE_ROOT=1

COPY ./app /app
WORKDIR /app

ENV PYTHONPATH=/app
ENV PYTHONUNBUFFERED=1

COPY ./app/fworker-start.sh /fworker-start.sh

RUN chmod +x /fworker-start.sh

CMD ["bash", "/fworker-start.sh"]
