import { pool } from "../config/database.js";
import * as Queries from "../queries/calendario.queries.js";
import { MENSAJES } from "../constantes/mensajes.js";
import { httpError } from "../utils/httpError.js";

export const getObtenerCalendario = async () => {
  const result = await pool.query(Queries.GETObtenerCalendario);
  return result.rows;
};

export const getObtenerCalendarioPorId = async (id) => {
  const result = await pool.query(Queries.GETObtenerCalendarioPorId, [id]);

  if (!result.rows[0]) {
    throw httpError(404, MENSAJES.CALENDARIO.NO_ENCONTRADO);
  }

  return result.rows[0];
};

export const getLeerHorariosPorFecha = async (fecha) => {
  const result = await pool.query(Queries.GETLeerHorariosPorFecha, [fecha]);

  // Sin turnos para esa fecha es un resultado válido: []
  return result.rows;
};

export const getLeerHorariosPorFechaYPuesto = async (fecha, id_puesto) => {
  const result = await pool.query(
    Queries.GETLeerHorariosPorFechaYPuesto,
    [fecha, id_puesto]
  );

  return result.rows;
};

export const crearCalendario = async (calendario) => {
  const { fecha, hora_inicio, hora_fin, id_puesto = null } = calendario;

  try {
    const result = await pool.query(
      Queries.CrearCalendario,
      [fecha, hora_inicio, hora_fin, id_puesto]
    );

    return result.rows[0];
  } catch (error) {
    // FK violation (id_puesto inexistente)
    if (error.code === '23503') {
      throw httpError(400, MENSAJES.VALIDACION.REFERENCIA_INVALIDA);
    }
    // CHECK violation (hora_fin <= hora_inicio) — respaldo del middleware
    if (error.code === '23514') {
      throw httpError(400, MENSAJES.CALENDARIO.HORARIO_INVALIDO);
    }

    throw error;
  }
};

export const putActualizarCalendario = async (id, calendario) => {
  const { fecha, hora_inicio, hora_fin, id_puesto = null } = calendario;

  try {
    const result = await pool.query(
      Queries.PUTActualizarCalendario,
      [fecha, hora_inicio, hora_fin, id_puesto, id]
    );

    if (!result.rows[0]) {
      throw httpError(404, MENSAJES.CALENDARIO.NO_ENCONTRADO);
    }

    return result.rows[0];
  } catch (error) {
    if (error.code === '23503') {
      throw httpError(400, MENSAJES.VALIDACION.REFERENCIA_INVALIDA);
    }
    if (error.code === '23514') {
      throw httpError(400, MENSAJES.CALENDARIO.HORARIO_INVALIDO);
    }

    throw error;
  }
};

export const deleteEliminarCalendario = async (id) => {
  const result = await pool.query(
    Queries.DELETEEliminarCalendario,
    [id]
  );

  if (result.rowCount === 0) {
    throw httpError(404, MENSAJES.CALENDARIO.NO_ENCONTRADO);
  }
};
