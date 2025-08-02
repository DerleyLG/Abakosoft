# Imagen base ligera
FROM node:18-alpine

# Crear directorio de trabajo
WORKDIR /app

# Copiar solo package.json y package-lock.json para instalar dependencias primero
COPY package*.json ./

# Instalar dependencias
RUN npm install

# Copiar el resto del código
COPY . .

# Exponer el puerto que usas (desde .env o directamente 3000)
EXPOSE 3000

# Comando de inicio
CMD ["node", "app.js"]
