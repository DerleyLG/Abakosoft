# Etapa de construcción
FROM node:18 AS build
WORKDIR /app

# Copiar primero solo los archivos necesarios para instalar y compilar
COPY package*.json ./
COPY .env ./
RUN npm install

# Ahora copiar el resto del código
COPY . .

# Ejecutar el build con las variables del .env ya disponibles
RUN npm run build

# Etapa de producción
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY ./nginx.conf /etc/nginx/conf.d/default.conf
