import crypto from "crypto";

/*
  Código rotativo del kiosco de asistencia.

  Mismo principio que los códigos de las apps de doble factor (TOTP,
  RFC 6238): el código es un HMAC-SHA256 del número de ventana de 30 s,
  firmado con un secreto que solo conoce el servidor. No se guarda en
  ningún lado: el servidor lo recalcula para validar. Quien no tiene el
  secreto no puede predecir el próximo código, y uno viejo deja de
  servir solo.

  El secreto es JWT_SECRET con un prefijo propio ("asistencia:"), así
  este HMAC nunca coincide con la firma de un token.
*/

export const PERIODO_SEGUNDOS = 30;

/*
  Se acepta la ventana actual y la anterior: el código que se escaneó
  justo antes del cambio sigue sirviendo mientras la página carga o el
  empleado inicia sesión. En total, un código dura entre 30 y 60 s.
*/
const VENTANAS_ACEPTADAS = 2;

const ventanaActual = (ahoraMs = Date.now()) =>
  Math.floor(ahoraMs / 1000 / PERIODO_SEGUNDOS);

const calcular = (ventana) => {
  const hmac = crypto
    .createHmac("sha256", process.env.JWT_SECRET)
    .update(`asistencia:${ventana}`)
    .digest();

  // Truncado dinámico de TOTP: 4 bytes a partir de un offset que sale
  // del propio hash, y de ahí los últimos 6 dígitos.
  const offset = hmac[hmac.length - 1] & 0x0f;
  const numero = hmac.readUInt32BE(offset) & 0x7fffffff;

  return String(numero % 1_000_000).padStart(6, "0");
};

/** Código vigente y cuántos segundos le quedan en pantalla. */
export const codigoVigente = (ahoraMs = Date.now()) => {
  const ventana = ventanaActual(ahoraMs);
  const finVentanaMs = (ventana + 1) * PERIODO_SEGUNDOS * 1000;

  return {
    codigo: calcular(ventana),
    venceEn: Math.ceil((finVentanaMs - ahoraMs) / 1000),
    periodo: PERIODO_SEGUNDOS
  };
};

/** true si el código corresponde a alguna de las ventanas aceptadas. */
export const codigoValido = (codigo, ahoraMs = Date.now()) => {
  const recibido = Buffer.from(String(codigo));
  const ventana = ventanaActual(ahoraMs);

  // Se comparan todas las ventanas sin cortar antes, con timingSafeEqual:
  // el tiempo de respuesta no revela cuántos dígitos acertó.
  let valido = false;
  for (let i = 0; i < VENTANAS_ACEPTADAS; i++) {
    const esperado = Buffer.from(calcular(ventana - i));
    if (esperado.length === recibido.length && crypto.timingSafeEqual(esperado, recibido)) {
      valido = true;
    }
  }

  return valido;
};
