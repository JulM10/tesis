import { MENSAJES } from "../constantes/mensajes.js";

const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const validarUsuario = (req, res, next) => {
  const { email, password, id_rol } = req.body;

  if (!email || !password || !id_rol) {
    return res.status(400).json({
      error: MENSAJES.VALIDACION.CAMPOS_OBLIGATORIOS
    });
  }

  if (!REGEX_EMAIL.test(email)) {
    return res.status(400).json({
      error: 'Email inválido'
    });
  }

  if (String(password).length < 8) {
    return res.status(400).json({
      error: 'La contraseña debe tener al menos 8 caracteres'
    });
  }

  if (isNaN(Number(id_rol))) {
    return res.status(400).json({
      error: 'id_rol debe ser numérico'
    });
  }

  next();
};
