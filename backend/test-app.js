const express = require('express');
const app = express();
const path = require('path');
const PORT = process.env.PORT || 3300;

app.get('/', (req, res) => {
  res.send('¡El servidor está funcionando!');
});

// AÑADE ESTA LÍNEA PARA DEPURAR EL PATH
console.log('Ruta estática para Express.static: ', path.join(__dirname, '..', 'frontend', 'dist'));
// AÑADE ESTA LÍNEA PARA VER LA RUTA ANTES DE app.get('*')
console.log('Ruta para app.get: ', '*');

app.use(express.static(path.join(__dirname, '..', 'frontend', 'dist')));

// Hemos cambiado el comodín '*' por la expresión regular /.*/ para evitar el error.
app.get(/.*/, (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Servidor de prueba corriendo en el puerto ${PORT}`);
});
