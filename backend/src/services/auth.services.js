import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { pool } from "../config/database.js";
import * as Queries from "../queries/auth.queries.js";
import { MENSAJES } from "../constantes/mensajes.js";

// 8 horas: cubre un turno laboral completo sin re-login
const JWT_EXPIRACION = "8h";

export const login = async (email, password) => {
  const result = await pool.query(Queries.GET_USUARIO_BY_EMAIL, [email]);
  const usuario = result.rows[0];

  // 401 genérico: no revelar si el email existe, si la password es
  // incorrecta o si el usuario está inactivo (evita user enumeration)
  if (!usuario || !usuario.activo) {
    throw { status: 401, message: MENSAJES.AUTH.CREDENCIALES_INVALIDAS };
  }

  const passwordOk = await bcrypt.compare(password, usuario.password_hash);

  if (!passwordOk) {
    throw { status: 401, message: MENSAJES.AUTH.CREDENCIALES_INVALIDAS };
  }

  const permisosResult = await pool.query(
    Queries.GET_PERMISOS_USUARIO,
    [usuario.id]
  );

  const roles = [...new Set(permisosResult.rows.map((r) => r.rol))];
  const permisos = [...new Set(permisosResult.rows.map((r) => r.permiso))];

  // Los permisos viajan dentro del token: un cambio de permisos en la BD
  // aplica recién en el próximo login
  const token = jwt.sign(
    { sub: usuario.id, email: usuario.email, roles, permisos },
    process.env.JWT_SECRET,
    { expiresIn: JWT_EXPIRACION }
  );

  return {
    token,
    usuario: {
      id: usuario.id,
      email: usuario.email,
      roles,
      permisos,
      /*
        Si es true, la cuenta todavía tiene la password inicial derivada
        de los datos del empleado. El frontend debe redirigir al cambio
        de password antes de dejar operar.
      */
      debe_cambiar_password: usuario.debe_cambiar_password
    }
  };
};

/*
  Cambio de password del usuario autenticado.

  Exige la password actual aunque ya haya un JWT válido: si alguien deja
  la sesión abierta, no debe poder apropiarse de la cuenta cambiando la
  credencial. Es también el paso que baja debe_cambiar_password.
*/
export const cambiarPassword = async (idUsuario, passwordActual, passwordNueva) => {
  const MIN_LARGO = 8;

  if (!passwordActual || !passwordNueva) {
    throw { status: 400, message: MENSAJES.VALIDACION.CAMPOS_OBLIGATORIOS };
  }

  if (passwordNueva.length < MIN_LARGO) {
    throw { status: 400, message: MENSAJES.AUTH.PASSWORD_MUY_CORTA };
  }

  const result = await pool.query(Queries.GET_USUARIO_BY_ID, [idUsuario]);
  const usuario = result.rows[0];

  if (!usuario || !usuario.activo) {
    throw { status: 401, message: MENSAJES.AUTH.CREDENCIALES_INVALIDAS };
  }

  const actualOk = await bcrypt.compare(passwordActual, usuario.password_hash);

  if (!actualOk) {
    throw { status: 401, message: MENSAJES.AUTH.CREDENCIALES_INVALIDAS };
  }

  // Sin esto, el usuario podría "cumplir" el cambio obligatorio
  // reingresando la misma password inicial y bajar el flag sin rotar nada.
  const esLaMisma = await bcrypt.compare(passwordNueva, usuario.password_hash);

  if (esLaMisma) {
    throw { status: 400, message: MENSAJES.AUTH.PASSWORD_REPETIDA };
  }

  await pool.query(Queries.UPDATE_PASSWORD, [
    await bcrypt.hash(passwordNueva, 10),
    idUsuario
  ]);

  return { message: MENSAJES.AUTH.PASSWORD_ACTUALIZADA };
};
