import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { pool } from "../config/database.js";
import * as Queries from "../queries/auth.queries.js";
import { MENSAJES } from "../constantes/mensajes.js";

/*
  Vida del token. Es corta a propósito y se apoya en la renovación por
  actividad (POST /api/auth/renovar): el frontend pide uno nuevo mientras
  el usuario trabaja, así que una sesión activa nunca se corta, pero un
  puesto de trabajo abandonado queda sin acceso en minutos.

  Es además lo que acota la revocación: un JWT sin estado no se puede
  invalidar, pero un usuario dado de baja deja de poder renovar, así que
  pierde el acceso dentro de esta ventana en lugar de toda la jornada.

  Deliberadamente algo mayor que el corte por inactividad del frontend
  (10 min), para que sea ese corte —y no el vencimiento del token— el que
  gobierne la experiencia.
*/
const JWT_EXPIRACION = "15m";

const firmarToken = (usuario, roles, permisos) =>
  jwt.sign(
    { sub: usuario.id, email: usuario.email, roles, permisos },
    process.env.JWT_SECRET,
    { expiresIn: JWT_EXPIRACION }
  );

// Los roles y permisos se leen de la BD en cada firma (login y renovación):
// así un cambio de permisos aplica en la próxima renovación, no recién
// cuando el usuario vuelve a loguearse.
const obtenerRolesYPermisos = async (idUsuario) => {
  const result = await pool.query(Queries.GET_PERMISOS_USUARIO, [idUsuario]);

  return {
    roles: [...new Set(result.rows.map((r) => r.rol))],
    permisos: [...new Set(result.rows.map((r) => r.permiso))]
  };
};

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

  const { roles, permisos } = await obtenerRolesYPermisos(usuario.id);

  return {
    token: firmarToken(usuario, roles, permisos),
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
  Renovación de la sesión. El frontend la llama mientras hay actividad,
  antes de que el token se venza, de modo que quien está trabajando no
  vea nunca la pantalla de login.

  Vuelve a consultar la BD en lugar de copiar los datos del token viejo,
  y eso es lo que le da valor: si la cuenta se desactivó o le cambiaron
  los permisos, la renovación lo refleja (o falla). Un token robado sirve
  hasta que vence; una cuenta dada de baja no consigue uno nuevo.
*/
export const renovar = async (idUsuario) => {
  const result = await pool.query(Queries.GET_USUARIO_BY_ID, [idUsuario]);
  const usuario = result.rows[0];

  if (!usuario || !usuario.activo) {
    throw { status: 401, message: MENSAJES.AUTH.CREDENCIALES_INVALIDAS };
  }

  const { roles, permisos } = await obtenerRolesYPermisos(usuario.id);

  return {
    token: firmarToken(usuario, roles, permisos),
    usuario: {
      id: usuario.id,
      email: usuario.email,
      roles,
      permisos,
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
