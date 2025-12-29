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
  const {
    id_usuario = null,
    nombre,
    apellido,
    edad = null,
    telefono = null,
    direccion = null,
    id_puesto = null,
    id_lugar = null,
    id_estado = null
  } = empleado;

  try {
    const result = await pool.query(
      Queries.CREATE_EMPLEADO,
      [
        id_usuario,
        nombre,
        apellido,
        edad,
        telefono,
        direccion,
        id_puesto,
        id_lugar,
        id_estado
      ]
    );
    return result.rows[0];
  } catch (error) {
    // UNIQUE violation (id_usuario)
    if (error.code === '23505') {
      throw {
        status: 409,
        message: 'El usuario ya tiene un empleado asociado'
      };
    }
    // FK violation
    if (error.code === '23503') {
      throw {
        status: 400,
        message: 'Referencia inválida (puesto, lugar, estado o usuario)'
      };
    }

    throw {
      status: 500,
      message: 'Error interno al crear el empleado'
    };
  }
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
