FROM roadiehq/broker:base AS base

LABEL maintainer="Roadie <engineering@roadie.io>"


USER root

RUN node --version
RUN apt-get update && apt-get install -y ca-certificates
ENV NPM_CONFIG_PREFIX=/home/node/.npm-global
ENV PATH=$PATH:/home/node/.npm-global/bin

ARG BROKER_VERSION

RUN if [ -n "$BROKER_VERSION" ]; then \
    npm install --global snyk-broker@$BROKER_VERSION; \
    else \
    npm install --global snyk-broker; \
    fi

ENV PATH=$PATH:/home/node/.npm-global/bin

USER root

RUN apt-get update && apt-get install -y curl
# Don't run as root
WORKDIR /home/node
USER node

ENV PREFLIGHT_CHECKS_ENABLED=false
ENV ACCEPT=/home/node/accept.json
COPY ./accept.json /home/node/
COPY ./start /home/node/start

ENTRYPOINT ["/home/node/start"]