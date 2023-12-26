FROM postgres:16-bookworm
LABEL maintainer="Anton Melser <anton@transcrob.es>"

ARG SOURCES_OVERRIDE=
RUN bash -c "if [ ! -z $SOURCES_OVERRIDE ] ; then echo 'deb $SOURCES_OVERRIDE bookworm main' > /etc/apt/sources.list; echo 'deb $SOURCES_OVERRIDE bookworm-updates main' >> /etc/apt/sources.list ; fi"

RUN apt-get update && apt-get upgrade -y \
  && apt-get install -y xz-utils tar gzip rsync openssh-client curl \
  && apt-get -y autoremove && apt-get -y clean \
  && rm -rf /var/lib/apt/lists/*

ADD backups-entrypoint.sh /app/entrypoint.sh

ENTRYPOINT [ "/app/entrypoint.sh" ]
