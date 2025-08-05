# Etapa de construcción
FROM node:18 AS build

WORKDIR /app
COPY package*.json ./
RUN npm install

# Copia todo (incluido .env)
COPY . .

# Vite leerá automáticamente el `.env` con VITE_API_URL
RUN npm run build
