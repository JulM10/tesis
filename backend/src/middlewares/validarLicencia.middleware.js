import { MENSAJES } from "../constantes/mensajes.js";

/*
  Validación de FORMA del alta de licencia. Las reglas de negocio
  (superposición, saldo de vacaciones, turnos asignados) necesitan la
  base y viven en licencias.services.js.
*/

export const TIPOS_LICENCIA = ["VACACIONES", "ENFERMEDAD", "ESPECIAL"];

const REGEX_FECHA = /^\d{4}-\d{2}-\d{2}$/;
const COMENTARIO_MAX = 500;

const fechaValida = (valor) =>
  typeof valor === "string" && REGEX_FECHA.test(valor) && !isNaN(Date.parse(valor));

export const validarLicencia = (req, res, next) => {
  const { tipo, fecha_desde, fecha_hasta, comentario } = req.body;

  if (!TIPOS_LICENCIA.includes(tipo)) {
    return res.status(400).json({ error: MENSAJES.LICENCIAS.TIPO_INVALIDO });
  }

  if (!fechaValida(fecha_desde) || !fechaValida(fecha_hasta)) {
    return res.status(400).json({ error: MENSAJES.LICENCIAS.FECHAS_INVALIDAS });
  }

  // Comparación de strings válida para AAAA-MM-DD.
  if (fecha_hasta < fecha_desde) {
    return res.status(400).json({ error: MENSAJES.LICENCIAS.RANGO_INVALIDO });
  }

  if (comentario !== undefined && comentario !== null && String(comentario).length > COMENTARIO_MAX) {
    return res.status(400).json({ error: MENSAJES.LICENCIAS.COMENTARIO_MUY_LARGO });
  }

  next();
};
