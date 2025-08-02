# Etapa de build
FROM node:18 AS build

WORKDIR /app
COPY . .
RUN npm install
RUN npm run build

# Etapa de producción
FROM nginx:stable-alpine

COPY --from=build /app/dist /usr/share/nginx/html

# Configura nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
