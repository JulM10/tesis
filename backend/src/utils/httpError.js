import { MENSAJES } from "../constantes/mensajes.js";

/**
 * Crea un Error con status HTTP para que los controllers respondan
 * con el código correcto (404, 409, etc.) en lugar de un 500 genérico.
 */
export const httpError = (status, message) => {
  const error = new Error(message);
  error.status = status;
  return error;
};

/**
 * Manejo uniforme de errores en controllers:
 * - Errores con status (creados con httpError): se responde tal cual.
 * - Errores inesperados: se loguean y se responde 500 genérico,
 *   sin filtrar detalles internos al cliente.
 */
export const responderError = (res, error) => {
  if (!error.status) {
    console.error("[API] Error no controlado:", error);
  }

  res.status(error.status || 500).json({
    error: error.status ? error.message : MENSAJES.GENERAL.ERROR_INTERNO
  });
};
