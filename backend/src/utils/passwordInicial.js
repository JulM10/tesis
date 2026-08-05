/*
  Generación de la credencial inicial de un empleado.

  Al dar de alta un empleado el sistema le crea automáticamente su
  usuario. La password se DERIVA de sus propios datos para que RRHH
  pueda entregársela sin canal seguro:

      Nombre + Apellido + últimos 4 dígitos del DNI   ->  JuanPerez5678

  Es deliberadamente predecible: nombre y apellido son públicos dentro
  del hotel, así que el único secreto real son 4 dígitos (10.000
  combinaciones). NO es una password de seguridad, es un vale de
  un solo uso: el usuario nace con debe_cambiar_password = true y el
  sistema exige rotarla antes de operar (ver auth.services.js).

  Las tildes y la ñ se normalizan a ASCII: "Pérez" -> "Perez",
  "Muñoz" -> "Munoz". Si no, el empleado tendría que tipear un acento
  para entrar y la password dependería de la codificación del teclado.
*/

import crypto from "crypto";

/*
  Quita diacríticos y todo lo que no sea una letra ASCII.
  NFD separa "é" en "e" + tilde combinante; como la tilde suelta no es
  A-Za-z, el propio filtro ASCII la descarta junto con espacios y guiones.
*/
const aAscii = (texto) =>
  String(texto ?? "")
    .normalize("NFD")
    .replace(/[^A-Za-z]/g, "");

/** "pEREZ" -> "Perez". Cadena vacía si no queda nada. */
const capitalizar = (texto) =>
  texto ? texto[0].toUpperCase() + texto.slice(1).toLowerCase() : "";

/** Deja solo los dígitos: "20.123.456" -> "20123456". */
export const normalizarDni = (dni) => String(dni ?? "").replace(/\D/g, "");

/**
 * Construye la password inicial a partir de los datos del empleado.
 * Nombres compuestos se colapsan sin espacios: "Ana María" -> "Anamaria".
 */
export const generarPasswordInicial = (nombre, apellido, dni) => {
  const digitos = normalizarDni(dni);

  return (
    capitalizar(aAscii(nombre)) +
    capitalizar(aAscii(apellido)) +
    digitos.slice(-4)
  );
};

/**
 * Deriva el email institucional a partir del nombre: nombre.apellido@hotel.com
 * Solo lo usa el seed; en el alta real el email lo indica quien carga el empleado.
 */
export const generarEmailInstitucional = (nombre, apellido) =>
  `${aAscii(nombre).toLowerCase()}.${aAscii(apellido).toLowerCase()}@hotel.com`;

/*
  Contraseña temporal para el RESET que hace el administrador.

  A diferencia de la del alta (derivada de los datos, predecible), esta es
  ALEATORIA: el admin la resetea cuando un usuario perdió el acceso, así
  que no debe poder adivinarse. Se muestra una vez y el usuario la cambia
  al ingresar (debe_cambiar_password = true).

  El alfabeto omite caracteres ambiguos (0/O, 1/l/I) para que el admin
  pueda dictarla por teléfono sin confusiones.
*/
const ALFABETO = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";

export const generarPasswordAleatoria = (largo = 10) => {
  const bytes = crypto.randomBytes(largo);
  let out = "";
  for (let i = 0; i < largo; i++) {
    out += ALFABETO[bytes[i] % ALFABETO.length];
  }
  return out;
};
