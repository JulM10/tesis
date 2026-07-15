import { pool } from "../config/database.js";
import * as Queries from "../queries/empleados.queries.js";
import { MENSAJES } from "../constantes/mensajes.js";
import { httpError } from "../utils/httpError.js";
import * as storage from "./storage.services.js";

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
    edad = null,
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
        edad,
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
    edad = null,
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
      [nombre, apellido, edad, telefono, direccion, notas, id_puesto, id_lugar, id_estado, id]
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
  // Si tiene CV, se elimina del storage (best-effort) antes de borrar la fila
  const cv = await pool.query(Queries.GET_CV, [id]);

  const result = await pool.query(
    Queries.DELETE_EMPLEADO,
    [id]
  );

  if (result.rowCount === 0) {
    throw httpError(404, MENSAJES.EMPLEADOS.NO_ENCONTRADO);
  }

  if (cv.rows[0]?.cv_ruta) {
    try {
      await storage.eliminarArchivo(cv.rows[0].cv_ruta);
    } catch {
      // El empleado ya se borró; un archivo huérfano en storage no es crítico
    }
  }
};

/* =====================================================
   CV adjunto (el binario vive en Supabase Storage)
   ===================================================== */

const EXTENSION_POR_MIME = {
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx"
};

export const subirCV = async (id, archivo) => {
  const existente = await pool.query(Queries.GET_CV, [id]);

  if (existente.rowCount === 0) {
    throw httpError(404, MENSAJES.EMPLEADOS.NO_ENCONTRADO);
  }

  // Ruta interna determinística y sin datos del nombre original
  // (el nombre original solo se guarda para la descarga)
  const extension = EXTENSION_POR_MIME[archivo.mimetype];
  const ruta = `empleado-${id}/cv-${Date.now()}.${extension}`;

  await storage.subirArchivo(ruta, archivo.buffer, archivo.mimetype);

  // Si había un CV anterior, se elimina del storage
  const rutaAnterior = existente.rows[0].cv_ruta;
  if (rutaAnterior) {
    await storage.eliminarArchivo(rutaAnterior);
  }

  const nombreOriginal = Buffer.from(archivo.originalname, "latin1")
    .toString("utf8")
    .slice(0, 200);

  const result = await pool.query(Queries.SET_CV, [
    ruta,
    nombreOriginal,
    archivo.mimetype,
    id
  ]);

  return result.rows[0];
};

export const descargarCV = async (id) => {
  const result = await pool.query(Queries.GET_CV, [id]);

  if (result.rowCount === 0) {
    throw httpError(404, MENSAJES.EMPLEADOS.NO_ENCONTRADO);
  }

  const { cv_ruta, cv_nombre, cv_mime } = result.rows[0];

  if (!cv_ruta) {
    throw httpError(404, MENSAJES.CV.NO_ENCONTRADO);
  }

  const buffer = await storage.descargarArchivo(cv_ruta);

  return { buffer, nombre: cv_nombre, mime: cv_mime };
};

export const eliminarCV = async (id) => {
  const result = await pool.query(Queries.GET_CV, [id]);

  if (result.rowCount === 0) {
    throw httpError(404, MENSAJES.EMPLEADOS.NO_ENCONTRADO);
  }

  const { cv_ruta } = result.rows[0];

  if (!cv_ruta) {
    throw httpError(404, MENSAJES.CV.NO_ENCONTRADO);
  }

  await storage.eliminarArchivo(cv_ruta);
  await pool.query(Queries.CLEAR_CV, [id]);
};
