FROM node:18-alpine
MAINTAINER Roadie
WORKDIR /usr/src/app
COPY package.json .
RUN npm install && npm install typescript -g
COPY . .
RUN yarn build
CMD ["node", "./bin/kubernetes-entity-provider"]
