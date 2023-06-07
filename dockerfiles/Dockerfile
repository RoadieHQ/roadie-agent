FROM snyk/ubuntu as base

MAINTAINER Roadie

USER root

RUN apt update && apt install -y make python gcc
RUN apt-get update && apt-get install -y ca-certificates
ENV NPM_CONFIG_PREFIX=/home/node/.npm-global
ENV PATH=$PATH:/home/node/.npm-global/bin
RUN npm install --global snyk-broker@4.147.0
FROM snyk/ubuntu
ENV PATH=$PATH:/home/node/.npm-global/bin
COPY --from=base /home/node/.npm-global /home/node/.npm-global
COPY --from=base /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/ca-certificates.crt

USER root
RUN apt-get install -y curl
# Don't run as root
WORKDIR /home/node
USER node

ENV PREFLIGHT_CHECKS_ENABLED=false
ENV ACCEPT=/home/node/accept.json
COPY ./accept.json /home/node/
COPY ./start /home/node/start

ENTRYPOINT ["/home/node/start"]
