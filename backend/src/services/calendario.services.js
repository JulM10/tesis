import { pool } from "../config/database.js";
import * as Queries from "../queries/calendario.queries.js";
import { MENSAJES } from "../constantes/mensajes.js";

export const getObtenerCalendario = async () => {
  const result = await pool.query(Queries.GETObtenerCalendario);
  return result.rows;
};

export const getObtenerCalendarioPorId = async (id) => {
  const result = await pool.query(Queries.GETObtenerCalendarioPorId, [id]);

  if (!result.rows[0]) {
    throw new Error(MENSAJES.CALENDARIO.NO_ENCONTRADO);
  }

  return result.rows[0];
};

export const getLeerHorariosPorFecha = async (fecha) => {
  const result = await pool.query(Queries.GETLeerHorariosPorFecha, [fecha]);

  if (result.rows.length === 0) {
    throw new Error(MENSAJES.HORARIOS.SIN_HORARIOS);
  }

  return result.rows;
};

export const getLeerHorariosPorFechaYPuesto = async (fecha, id_puesto) => {
  const result = await pool.query(
    Queries.GETLeerHorariosPorFechaYPuesto,
    [fecha, id_puesto]
  );

  if (result.rows.length === 0) {
    throw new Error(MENSAJES.HORARIOS.SIN_HORARIOS);
  }

  return result.rows;
};

export const crearCalendario = async (calendario) => {
  const { fecha, hora_inicio, hora_fin, id_puesto } = calendario;

  const result = await pool.query(
    Queries.CrearCalendario,
    [fecha, hora_inicio, hora_fin, id_puesto]
  );

  return {
    message: MENSAJES.CALENDARIO.CREADO_OK,
    data: result.rows[0]
  };
};

export const putActualizarCalendario = async (id, calendario) => {
  const { fecha, hora_inicio, hora_fin, id_puesto } = calendario;

  const result = await pool.query(
    Queries.PUTActualizarCalendario,
    [fecha, hora_inicio, hora_fin, id_puesto, id]
  );

  if (!result.rows[0]) {
    throw new Error(MENSAJES.CALENDARIO.NO_ENCONTRADO);
  }

  return {
    message: MENSAJES.CALENDARIO.ACTUALIZADO_OK,
    data: result.rows[0]
  };
};

export const deleteEliminarCalendario = async (id) => {
  const result = await pool.query(
    Queries.DELETEEliminarCalendario,
    [id]
  );

  if (result.rowCount === 0) {
    throw new Error(MENSAJES.CALENDARIO.NO_ENCONTRADO);
  }

  return {
    message: MENSAJES.CALENDARIO.ELIMINADO_OK
  };
};
