import { pool } from "../config/database.js";
import * as Queries from "../queries/me.queries.js";
import { MENSAJES } from "../constantes/mensajes.js";
import { httpError } from "../utils/httpError.js";

export const getMiEmpleado = async (idUsuario) => {
  const result = await pool.query(Queries.GET_MI_EMPLEADO, [idUsuario]);
  // Puede ser null: hay usuarios sin empleado vinculado (ej. admin)
  return result.rows[0] ?? null;
};

export const getMisHorarios = async (idUsuario) => {
  const empleado = await getMiEmpleado(idUsuario);

  if (!empleado) {
    return [];
  }

  const result = await pool.query(Queries.GET_MIS_HORARIOS, [empleado.empleado_id]);
  return result.rows;
};

export const updateMisDatos = async (idUsuario, datos) => {
  const { telefono = null, direccion = null, notas = null } = datos;

  const result = await pool.query(Queries.UPDATE_MIS_DATOS, [
    telefono,
    direccion,
    notas,
    idUsuario
  ]);

  if (!result.rows[0]) {
    throw httpError(404, MENSAJES.ME.SIN_EMPLEADO);
  }

  return result.rows[0];
};
