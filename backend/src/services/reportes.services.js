import { pool } from "../config/database.js";
import * as Queries from "../queries/reportes.queries.js";

/*
  Reportes sobre el historial inmutable (asignacion_horario_historial).
  Nota de diseño: el historial guarda datos operativos + nombres en
  claro (proporcionalidad Ley 25.326), por lo que estos reportes se
  resuelven 100% en SQL sin descifrar nada.
*/

export const getHistorial = async ({ desde = null, hasta = null, empleado = null, puesto = null }) => {
  const result = await pool.query(Queries.GET_HISTORIAL, [desde, hasta, empleado, puesto]);
  return result.rows;
};

export const getHorasTrabajadas = async ({ desde, hasta }) => {
  const result = await pool.query(Queries.GET_HORAS_TRABAJADAS, [desde, hasta]);
  return result.rows;
};

export const getDotacion = async () => {
  const result = await pool.query(Queries.GET_DOTACION);
  return result.rows;
};
