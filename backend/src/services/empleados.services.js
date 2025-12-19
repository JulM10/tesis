import { pool } from "../config/database.js";
import * as Queries from "../queries/empleados.queries.js";

export const getAllEmpleados = async () => {
  const result = await pool.query(Queries.GET_ALL_EMPLEADOS);
  return result.rows;
};

export const getEmpleadoById = async (id) => {
  const result = await pool.query(Queries.GET_EMPLEADO_BY_ID, [id]);
  return result.rows[0];
}
export const createEmpleado = async (empleado) => {
  try {
    const { nombre, apellido, edad, id_puesto, id_lugar } = empleado;
    const result = await pool.query(Queries.CREATE_EMPLEADO, [nombre, apellido, edad, id_puesto, id_lugar]);
    return result.rows[0];
  } catch (error) {
    console.error("Error creating empleado:", error.message);
    throw error;
  }
};

export const updateEmpleado = async (id, empleado) => {
  const { nombre, apellido, edad, id_puesto, id_lugar } = empleado;
  const result = await pool.query(Queries.UPDATE_EMPLEADO, [    nombre, apellido, edad, id_puesto, id_lugar, id  ]);
  return result.rows[0];
};
export const deleteEmpleado = async (id) => {
  await pool.query(Queries.DELETE_EMPLEADO, [id]);
};
