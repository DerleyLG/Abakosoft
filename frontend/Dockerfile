# Etapa de build
FROM node:18-alpine AS build
WORKDIR /app
COPY . .
RUN npm install && npm run build

# Etapa de producción
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY ./nginx.conf /etc/nginx/conf.d/default.conf
