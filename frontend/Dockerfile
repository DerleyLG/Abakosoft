# Etapa de construcción
FROM node:18 AS build
WORKDIR /app
COPY . .
ENV VITE_API_URL=http://abakosoft-backend-ed7tli-7232ca-148-230-91-63.traefik.me/api

RUN npm install
RUN npm run build

# Etapa de producción
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY ./nginx.conf /etc/nginx/conf.d/default.conf
