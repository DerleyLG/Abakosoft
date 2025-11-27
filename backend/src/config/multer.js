const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Crear directorio si no existe
const uploadDir = path.join(__dirname, "../../uploads/comprobantes");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configuración de almacenamiento
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generar nombre único: orden_{id}_{timestamp}.{ext}
    const uniqueSuffix = Date.now();
    const ext = path.extname(file.originalname);
    const ordenId = req.body.id_orden_compra || "temp";
    cb(null, `orden_${ordenId}_${uniqueSuffix}${ext}`);
  },
});

// Filtro de archivos
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "application/pdf",
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        "Tipo de archivo no permitido. Solo se aceptan JPG, PNG y PDF."
      ),
      false
    );
  }
};

// Configuración de multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB máximo
  },
});

module.exports = upload;
