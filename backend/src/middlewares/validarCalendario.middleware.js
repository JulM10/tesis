import { MENSAJES } from "../constantes/mensajes.js";

const REGEX_FECHA = /^\d{4}-\d{2}-\d{2}$/;
const REGEX_HORA = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;

export const validarCalendario = (req, res, next) => {
  const { fecha, hora_inicio, hora_fin, id_puesto } = req.body;

  if (!fecha || !hora_inicio || !hora_fin) {
    return res.status(400).json({
      error: MENSAJES.VALIDACION.CAMPOS_OBLIGATORIOS
    });
  }

  if (!REGEX_FECHA.test(fecha) || isNaN(Date.parse(fecha))) {
    return res.status(400).json({
      error: 'Fecha inválida (formato esperado: YYYY-MM-DD)'
    });
  }

  if (!REGEX_HORA.test(hora_inicio) || !REGEX_HORA.test(hora_fin)) {
    return res.status(400).json({
      error: 'Hora inválida (formato esperado: HH:MM)'
    });
  }

  // Comparación de strings válida para HH:MM con cero a la izquierda.
  // Limitación conocida: no se soportan turnos que cruzan la medianoche.
  if (hora_fin <= hora_inicio) {
    return res.status(400).json({
      error: MENSAJES.CALENDARIO.HORARIO_INVALIDO
    });
  }

  if (id_puesto !== undefined && id_puesto !== null && isNaN(Number(id_puesto))) {
    return res.status(400).json({
      error: 'id_puesto debe ser numérico'
    });
  }

  next();
};
