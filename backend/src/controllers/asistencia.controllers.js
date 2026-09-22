import * as asistenciaService from "../services/asistencia.services.js";
import { codigoVigente } from "../utils/codigoAsistencia.js";
import { MENSAJES } from "../constantes/mensajes.js";
import { responderError } from "../utils/httpError.js";

/**
 * Código vigente para la pantalla del kiosco
 */
export const getCodigo = (req, res) => {
  // Nunca cachear: un código viejo en un proxy o en el navegador no sirve.
  res.set("Cache-Control", "no-store");
  res.json(codigoVigente());
};

/**
 * Corrección de marcas por RRHH
 */
export const corregirAsistencia = async (req, res) => {
  try {
    const { id_empleado, id_calendario } = req.params;
    const asignacion = await asistenciaService.corregir(id_empleado, id_calendario, req.body);

    res.json({
      message: MENSAJES.ASISTENCIA.CORREGIDA_OK,
      data: asignacion
    });
  } catch (error) {
    responderError(res, error);
  }
};
