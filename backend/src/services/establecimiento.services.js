import { pool } from "../config/database.js";
import * as Queries from "../queries/establecimiento.queries.js";
import { httpError } from "../utils/httpError.js";
import { MENSAJES } from "../constantes/mensajes.js";

/*
  ABM de puestos y lugares de trabajo (la "distribución del establecimiento").

  Las dos entidades comparten forma (id + nombre) y reglas, así que la lógica
  vive una sola vez y cada entidad aporta sus queries desde este mapa. El mapa
  es además la lista blanca: un :tipo que no esté acá se rechaza con 404.

  Los estados quedan afuera a propósito: sus nombres están acoplados a la
  lógica del frontend (indicadores del dashboard, colores de badge), así que
  renombrarlos desde la UI rompería esas pantallas sin lanzar ningún error.
*/
const ENTIDADES = {
  puestos: {
    etiqueta: "puesto",
    largoMaximo: 100,
    // El calendario pinta cada turno con el color de su puesto.
    conColor: true,
    crear: Queries.CREAR_PUESTO,
    editar: Queries.EDITAR_PUESTO,
    eliminar: Queries.ELIMINAR_PUESTO,
    contarUso: Queries.CONTAR_USO_PUESTO
  },
  lugares: {
    etiqueta: "lugar de trabajo",
    largoMaximo: 50,
    crear: Queries.CREAR_LUGAR,
    editar: Queries.EDITAR_LUGAR,
    eliminar: Queries.ELIMINAR_LUGAR,
    contarUso: Queries.CONTAR_USO_LUGAR
  }
};

// Código de Postgres para violación de UNIQUE.
const UNIQUE_VIOLATION = "23505";

const obtenerEntidad = (tipo) => {
  const entidad = ENTIDADES[tipo];

  if (!entidad) {
    throw httpError(404, MENSAJES.ESTABLECIMIENTO.TIPO_INVALIDO);
  }

  return entidad;
};

const normalizarNombre = (nombre, entidad) => {
  const limpio = typeof nombre === "string" ? nombre.trim() : "";

  if (!limpio) {
    throw httpError(400, MENSAJES.ESTABLECIMIENTO.NOMBRE_REQUERIDO);
  }

  if (limpio.length > entidad.largoMaximo) {
    throw httpError(400, MENSAJES.ESTABLECIMIENTO.NOMBRE_MUY_LARGO);
  }

  return limpio;
};

const REGEX_COLOR = /^#[0-9a-f]{6}$/;

// null si no se envió (el alta usa el default y la edición conserva el actual).
const normalizarColor = (color) => {
  if (color === undefined || color === null || color === "") return null;

  const limpio = String(color).trim().toLowerCase();

  if (!REGEX_COLOR.test(limpio)) {
    throw httpError(400, MENSAJES.ESTABLECIMIENTO.COLOR_INVALIDO);
  }

  return limpio;
};

const validarId = (id) => {
  const numero = Number(id);

  if (!Number.isInteger(numero) || numero <= 0) {
    throw httpError(400, MENSAJES.VALIDACION.ID_INVALIDO);
  }

  return numero;
};

/*
  El UNIQUE de la tabla es lo que decide si el nombre está repetido: se
  intenta el INSERT/UPDATE y se traduce el error. Consultar antes "¿existe?"
  dejaría una ventana entre la consulta y la escritura en la que otro
  administrador podría insertar el mismo nombre.
*/
const traducirDuplicado = (error) => {
  if (error.code === UNIQUE_VIOLATION) {
    return httpError(409, MENSAJES.ESTABLECIMIENTO.NOMBRE_DUPLICADO);
  }

  return error;
};

// Las entidades sin color ignoran el que venga en el pedido.
const parametros = (entidad, nombre, color) =>
  entidad.conColor ? [nombre, normalizarColor(color)] : [nombre];

export const crear = async (tipo, nombre, color) => {
  const entidad = obtenerEntidad(tipo);
  const limpio = normalizarNombre(nombre, entidad);
  const valores = parametros(entidad, limpio, color);

  try {
    const result = await pool.query(entidad.crear, valores);
    return result.rows[0];
  } catch (error) {
    throw traducirDuplicado(error);
  }
};

export const editar = async (tipo, id, nombre, color) => {
  const entidad = obtenerEntidad(tipo);
  const idValido = validarId(id);
  const limpio = normalizarNombre(nombre, entidad);
  const valores = [...parametros(entidad, limpio, color), idValido];

  let result;

  try {
    result = await pool.query(entidad.editar, valores);
  } catch (error) {
    throw traducirDuplicado(error);
  }

  if (result.rowCount === 0) {
    throw httpError(404, MENSAJES.ESTABLECIMIENTO.NO_ENCONTRADO);
  }

  return result.rows[0];
};

/*
  Las FK ya impedirían borrar algo en uso, pero el error de Postgres no le
  dice al usuario cuántos registros lo están usando. Se cuenta primero para
  responder un mensaje accionable ("en uso por 3 empleados").
*/
export const eliminar = async (tipo, id) => {
  const entidad = obtenerEntidad(tipo);
  const idValido = validarId(id);

  const uso = await pool.query(entidad.contarUso, [idValido]);
  const { empleados, turnos } = uso.rows[0];

  if (empleados > 0 || turnos > 0) {
    const partes = [];

    if (empleados > 0) partes.push(`${empleados} empleado${empleados === 1 ? "" : "s"}`);
    if (turnos > 0) partes.push(`${turnos} turno${turnos === 1 ? "" : "s"}`);

    throw httpError(
      409,
      `No se puede eliminar el ${entidad.etiqueta}: en uso por ${partes.join(" y ")}`
    );
  }

  const result = await pool.query(entidad.eliminar, [idValido]);

  if (result.rowCount === 0) {
    throw httpError(404, MENSAJES.ESTABLECIMIENTO.NO_ENCONTRADO);
  }
};
