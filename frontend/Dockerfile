FROM node:24-alpine@sha256:8a32c8cf649a49915a66e81e7a609223c708d0adabf288ee3f4077d765542f85 AS build
WORKDIR /origem
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build-only

FROM nginxinc/nginx-unprivileged:1.27-alpine@sha256:65e3e85dbaed8ba248841d9d58a899b6197106c23cb0ff1a132b7bfe0547e4c0 AS final
COPY nginx/cabecalhos-seguranca.conf /etc/nginx/snippets/cabecalhos-seguranca.conf
COPY nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=build /origem/dist /usr/share/nginx/html
EXPOSE 8080
