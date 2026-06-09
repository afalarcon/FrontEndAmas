FROM node:22-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build -- --no-progress

FROM nginx:1.27-alpine

ENV AMAS_API_BASE_URL=https://api.amaslohaceposible.cloud/api/v1

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/landing-amas/browser /usr/share/nginx/html

RUN printf '%s\n' \
  '#!/bin/sh' \
  'set -eu' \
  'echo "window.__AMAS_API_BASE_URL__=\"${AMAS_API_BASE_URL}\";" > /usr/share/nginx/html/runtime-config.js' \
  > /docker-entrypoint.d/99-amas-runtime-config.sh \
  && chmod +x /docker-entrypoint.d/99-amas-runtime-config.sh
