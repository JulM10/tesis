import jwt from "jsonwebtoken";
import { MENSAJES } from "../constantes/mensajes.js";

/**
 * Verifica el JWT del header Authorization (Bearer <token>).
 * Si es válido, adjunta el payload en req.usuario y continúa.
 */
export const autenticar = (req, res, next) => {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({
      error: MENSAJES.AUTH.NO_AUTORIZADO
    });
  }

  try {
    const token = header.slice("Bearer ".length);
    req.usuario = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (error) {
    return res.status(401).json({
      error: MENSAJES.AUTH.TOKEN_INVALIDO
    });
  }
};
