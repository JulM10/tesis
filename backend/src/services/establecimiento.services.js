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

export const crear = async (tipo, nombre) => {
  const entidad = obtenerEntidad(tipo);
  const limpio = normalizarNombre(nombre, entidad);

  try {
    const result = await pool.query(entidad.crear, [limpio]);
    return result.rows[0];
  } catch (error) {
    throw traducirDuplicado(error);
  }
};

export const editar = async (tipo, id, nombre) => {
  const entidad = obtenerEntidad(tipo);
  const idValido = validarId(id);
  const limpio = normalizarNombre(nombre, entidad);

  let result;

  try {
    result = await pool.query(entidad.editar, [limpio, idValido]);
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
