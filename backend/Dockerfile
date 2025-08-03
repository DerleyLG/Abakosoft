# Imagen base ligera
FROM node:18-alpine

# Crear directorio de trabajo
WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar dependencias
RUN npm install

# Copiar el resto del código
COPY . .

# Exponer el puerto correcto
EXPOSE 3300

# Comando para iniciar el backend
CMD ["node", "app.js"]
