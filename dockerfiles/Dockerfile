FROM snyk/ubuntu as base

MAINTAINER Roadie

USER root

RUN apt update && apt install -y make python gcc
RUN apt-get update && apt-get install -y ca-certificates
ENV NPM_CONFIG_PREFIX=/home/node/.npm-global
ENV PATH=$PATH:/home/node/.npm-global/bin
RUN npm install --global snyk-broker
FROM snyk/ubuntu
ENV PATH=$PATH:/home/node/.npm-global/bin
COPY --from=base /home/node/.npm-global /home/node/.npm-global
COPY --from=base /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/ca-certificates.crt

# Removing debug@0.7.4 (setheader transitive) to satisfy some scanners still reporting this false positive
RUN rm -rf /home/node/.npm-global/lib/node_modules/snyk-broker/node_modules/setheader/node_modules/debug
# Removing tough-cookie@2.5.0 (request and request-native-promise transitive) to satisfy some scanners still reporting this false positive
RUN rm -rf /home/node/.npm-global/lib/node_modules/snyk-broker/node_modules/tough-cookie

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
