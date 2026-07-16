import { pool } from "../config/database.js";
import * as Queries from "../queries/empleados.queries.js";
import { MENSAJES } from "../constantes/mensajes.js";
import { httpError } from "../utils/httpError.js";

export const getAllEmpleados = async () => {
  const result = await pool.query(Queries.GET_ALL_EMPLEADOS);

  // Lista vacía es un resultado válido, no un error
  return result.rows;
};

export const getEmpleadosDetalle = async () => {
  // Vista con puesto, lugar, estado y datos de usuario resueltos
  const result = await pool.query(Queries.GET_EMPLEADOS_DETALLE);
  return result.rows;
};

export const getEmpleadoById = async (id) => {
  const result = await pool.query(Queries.GET_EMPLEADO_BY_ID, [id]);

  if (!result.rows[0]) {
    throw httpError(404, MENSAJES.EMPLEADOS.NO_ENCONTRADO);
  }

  return result.rows[0];
};

export const createEmpleado = async (empleado) => {
  const {
    id_usuario = null,
    nombre,
    apellido,
    fecha_nacimiento = null,
    telefono = null,
    direccion = null,
    notas = null,
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
        fecha_nacimiento,
        telefono,
        direccion,
        notas,
        id_puesto,
        id_lugar,
        id_estado
      ]
    );
    return result.rows[0];
  } catch (error) {
    // UNIQUE violation (id_usuario)
    if (error.code === '23505') {
      throw httpError(409, MENSAJES.EMPLEADOS.USUARIO_YA_ASOCIADO);
    }
    // FK violation (puesto, lugar, estado o usuario inexistente)
    if (error.code === '23503') {
      throw httpError(400, MENSAJES.VALIDACION.REFERENCIA_INVALIDA);
    }

    throw error;
  }
};

export const updateEmpleado = async (id, empleado) => {
  const {
    nombre = null,
    apellido = null,
    fecha_nacimiento = null,
    telefono = null,
    direccion = null,
    notas = null,
    id_puesto = null,
    id_lugar = null,
    id_estado = null
  } = empleado;

  try {
    // Actualización parcial: los campos no enviados conservan su valor
    // (COALESCE en la query). Limitación: no permite setear un campo a NULL.
    const result = await pool.query(
      Queries.UPDATE_EMPLEADO,
      [nombre, apellido, fecha_nacimiento, telefono, direccion, notas, id_puesto, id_lugar, id_estado, id]
    );

    if (!result.rows[0]) {
      throw httpError(404, MENSAJES.EMPLEADOS.NO_ENCONTRADO);
    }

    return result.rows[0];
  } catch (error) {
    if (error.code === '23503') {
      throw httpError(400, MENSAJES.VALIDACION.REFERENCIA_INVALIDA);
    }

    throw error;
  }
};

export const deleteEmpleado = async (id) => {
  // El CV (empleados_cv) se borra solo por ON DELETE CASCADE
  const result = await pool.query(
    Queries.DELETE_EMPLEADO,
    [id]
  );

  if (result.rowCount === 0) {
    throw httpError(404, MENSAJES.EMPLEADOS.NO_ENCONTRADO);
  }
};

/* =====================================================
   CV adjunto (el binario vive en Postgres, tabla empleados_cv)
   ===================================================== */

const validarEmpleadoExiste = async (id) => {
  const result = await pool.query(Queries.EXISTE_EMPLEADO, [id]);

  if (result.rowCount === 0) {
    throw httpError(404, MENSAJES.EMPLEADOS.NO_ENCONTRADO);
  }
};

export const subirCV = async (id, archivo) => {
  await validarEmpleadoExiste(id);

  // multer entrega el nombre original en latin1; se normaliza a UTF-8
  const nombreOriginal = Buffer.from(archivo.originalname, "latin1")
    .toString("utf8")
    .slice(0, 200);

  // Upsert: alta o reemplazo del CV en una sola operación atómica
  const result = await pool.query(Queries.SET_CV, [
    id,
    nombreOriginal,
    archivo.mimetype,
    archivo.buffer
  ]);

  return result.rows[0];
};

export const descargarCV = async (id) => {
  await validarEmpleadoExiste(id);

  const result = await pool.query(Queries.GET_CV, [id]);

  if (result.rowCount === 0) {
    throw httpError(404, MENSAJES.CV.NO_ENCONTRADO);
  }

  const { nombre, mime, archivo } = result.rows[0];

  return { buffer: archivo, nombre, mime };
};

export const eliminarCV = async (id) => {
  await validarEmpleadoExiste(id);

  const result = await pool.query(Queries.CLEAR_CV, [id]);

  if (result.rowCount === 0) {
    throw httpError(404, MENSAJES.CV.NO_ENCONTRADO);
  }
};
