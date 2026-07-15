import multer from "multer";
import { MENSAJES } from "../constantes/mensajes.js";

const MAX_TAMANIO_MB = 5;

const MIMES_PERMITIDOS = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document" // .docx
];

const upload = multer({
  storage: multer.memoryStorage(), // nunca toca el disco del servidor
  limits: { fileSize: MAX_TAMANIO_MB * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!MIMES_PERMITIDOS.includes(file.mimetype)) {
      return cb(new Error(MENSAJES.CV.TIPO_INVALIDO));
    }
    cb(null, true);
  }
});

/**
 * Procesa el campo "cv" del form-data y traduce los errores de multer
 * a respuestas 400 con mensaje claro.
 */
export const subirCV = (req, res, next) => {
  upload.single("cv")(req, res, (error) => {
    if (error) {
      const mensaje =
        error.code === "LIMIT_FILE_SIZE"
          ? MENSAJES.CV.MUY_GRANDE
          : error.message || MENSAJES.CV.TIPO_INVALIDO;
      return res.status(400).json({ error: mensaje });
    }

    if (!req.file) {
      return res.status(400).json({ error: MENSAJES.CV.ARCHIVO_REQUERIDO });
    }

    next();
  });
};
