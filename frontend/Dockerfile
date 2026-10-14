FROM node:24-alpine AS build
WORKDIR /origem
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build-only

FROM nginxinc/nginx-unprivileged:1.27-alpine AS final
COPY nginx/cabecalhos-seguranca.conf /etc/nginx/snippets/cabecalhos-seguranca.conf
COPY nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=build /origem/dist /usr/share/nginx/html
EXPOSE 8080
