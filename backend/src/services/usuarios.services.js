import bcrypt from "bcryptjs";
import { pool } from "../config/database.js";
import * as Queries from "../queries/usuarios.queries.js";
import { MENSAJES } from "../constantes/mensajes.js";
import { httpError } from "../utils/httpError.js";
import { generarPasswordAleatoria } from "../utils/passwordInicial.js";

export const getUsuarios = async () => {
  const result = await pool.query(Queries.GET_ALL_USUARIOS);
  return result.rows;
};

export const getRoles = async () => {
  const result = await pool.query(Queries.GET_ROLES);
  return result.rows;
};

/**
 * Alta de usuario en transacción: credenciales + rol + vínculo
 * opcional con un empleado existente.
 */
export const createUsuario = async ({ email, password, id_rol, id_empleado = null }) => {
  const passwordHash = await bcrypt.hash(password, 10);
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    let usuario;
    try {
      const result = await client.query(Queries.CREATE_USUARIO, [email, passwordHash]);
      usuario = result.rows[0];
    } catch (error) {
      if (error.code === "23505") {
        throw httpError(409, MENSAJES.USUARIOS.EMAIL_YA_EXISTE);
      }
      throw error;
    }

    try {
      await client.query(Queries.ASIGNAR_ROL, [usuario.id, id_rol]);
    } catch (error) {
      if (error.code === "23503") {
        throw httpError(400, MENSAJES.VALIDACION.REFERENCIA_INVALIDA);
      }
      throw error;
    }

    if (id_empleado) {
      const vinculo = await client.query(Queries.VINCULAR_EMPLEADO, [
        usuario.id,
        id_empleado
      ]);

      if (vinculo.rowCount === 0) {
        throw httpError(409, MENSAJES.USUARIOS.EMPLEADO_YA_VINCULADO);
      }
    }

    await client.query("COMMIT");
    return usuario;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Actualiza email, estado (activo) y/o rol de un usuario.
 * Los tres son opcionales: se aplica solo lo que venga en el body.
 */
export const updateUsuario = async (id, { activo, id_rol, email }) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    let usuario = null;

    if (email !== undefined) {
      const limpio = String(email).trim();
      if (!EMAIL_RE.test(limpio)) {
        throw httpError(400, MENSAJES.USUARIOS.EMAIL_INVALIDO);
      }
      try {
        const result = await client.query(Queries.UPDATE_USUARIO_EMAIL, [limpio, id]);
        usuario = result.rows[0];
      } catch (error) {
        if (error.code === "23505") {
          throw httpError(409, MENSAJES.USUARIOS.EMAIL_YA_EXISTE);
        }
        throw error;
      }
      if (!usuario) {
        throw httpError(404, MENSAJES.USUARIOS.NO_ENCONTRADO);
      }
    }

    if (activo !== undefined) {
      const result = await client.query(Queries.UPDATE_USUARIO_ACTIVO, [activo, id]);
      usuario = result.rows[0];
      if (!usuario) {
        throw httpError(404, MENSAJES.USUARIOS.NO_ENCONTRADO);
      }
    }

    if (id_rol !== undefined) {
      await client.query(Queries.QUITAR_ROLES, [id]);
      try {
        await client.query(Queries.ASIGNAR_ROL, [id, id_rol]);
      } catch (error) {
        if (error.code === "23503") {
          throw httpError(400, MENSAJES.VALIDACION.REFERENCIA_INVALIDA);
        }
        throw error;
      }
    }

    await client.query("COMMIT");
    return usuario;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Reset de contraseña por el administrador.
 * Genera una contraseña temporal aleatoria, la guarda hasheada y fuerza
 * el cambio en el próximo login. Devuelve la contraseña en claro UNA vez
 * (nunca queda almacenada legible) para que el admin se la entregue.
 */
export const resetPassword = async (id) => {
  const passwordTemporal = generarPasswordAleatoria();
  const passwordHash = await bcrypt.hash(passwordTemporal, 10);

  const result = await pool.query(Queries.RESET_PASSWORD, [passwordHash, id]);

  if (!result.rows[0]) {
    throw httpError(404, MENSAJES.USUARIOS.NO_ENCONTRADO);
  }

  return {
    email: result.rows[0].email,
    password_temporal: passwordTemporal
  };
};

export const deleteUsuario = async (id) => {
  // usuarios_roles se borra en cascada; empleados.id_usuario queda en NULL
  const result = await pool.query(Queries.DELETE_USUARIO, [id]);

  if (result.rowCount === 0) {
    throw httpError(404, MENSAJES.USUARIOS.NO_ENCONTRADO);
  }
};
