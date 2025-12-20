import { pool } from "../config/database.js";
import * as Queries from "../queries/empleados.queries.js";
import { MENSAJES } from "../constantes/mensajes.js";

export const getAllEmpleados = async () => {
  const result = await pool.query(Queries.GET_ALL_EMPLEADOS);

  if (result.rows.length === 0) {
    throw new Error(MENSAJES.EMPLEADOS.SIN_RESULTADOS);
  }

  return result.rows;
};

export const getEmpleadoById = async (id) => {
  const result = await pool.query(Queries.GET_EMPLEADO_BY_ID, [id]);

  if (!result.rows[0]) {
    throw new Error(MENSAJES.EMPLEADOS.NO_ENCONTRADO);
  }

  return result.rows[0];
};

export const createEmpleado = async (empleado) => {
  const { nombre, apellido, edad, id_puesto, id_lugar } = empleado;

  const result = await pool.query(
    Queries.CREATE_EMPLEADO,
    [nombre, apellido, edad, id_puesto, id_lugar]
  );

  return {
    message: MENSAJES.EMPLEADOS.CREADO_OK,
    data: result.rows[0]
  };
};

export const updateEmpleado = async (id, empleado) => {
  const { nombre, apellido, edad, id_puesto, id_lugar } = empleado;

  const result = await pool.query(
    Queries.UPDATE_EMPLEADO,
    [nombre, apellido, edad, id_puesto, id_lugar, id]
  );

  if (!result.rows[0]) {
    throw new Error(MENSAJES.EMPLEADOS.NO_ENCONTRADO);
  }

  return {
    message: MENSAJES.EMPLEADOS.ACTUALIZADO_OK,
    data: result.rows[0]
  };
};

export const deleteEmpleado = async (id) => {
  const result = await pool.query(
    Queries.DELETE_EMPLEADO,
    [id]
  );

  if (result.rowCount === 0) {
    throw new Error(MENSAJES.EMPLEADOS.NO_ENCONTRADO);
  }

  return {
    message: MENSAJES.EMPLEADOS.ELIMINADO_OK
  };
};
