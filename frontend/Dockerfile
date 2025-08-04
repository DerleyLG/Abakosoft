# Etapa de construcción
FROM node:18 AS build

# Define el directorio de trabajo
WORKDIR /app

# Define el argumento de compilación para VITE_API_URL
# Esto permite que Docker Compose le pase el valor
ARG VITE_API_URL

# Copia los archivos de configuración y dependencias
COPY package*.json ./

# Instala las dependencias
RUN npm install

# Copia el resto del código de la aplicación
COPY . .

# Ejecuta el comando de compilación, pasando la variable de entorno
# Esto asegura que Vite tenga acceso al valor durante la compilación
RUN VITE_API_URL=${VITE_API_URL} npm run build

# ---
# Etapa de producción
FROM nginx:alpine

# Copia los archivos estáticos compilados
COPY --from=build /app/dist /usr/share/nginx/html

# Copia tu archivo de configuración de Nginx
COPY ./nginx.conf /etc/nginx/conf.d/default.conf

# Expone el puerto 80 del contenedor
EXPOSE 80