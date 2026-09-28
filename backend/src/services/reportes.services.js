import { pool } from "../config/database.js";
import * as Queries from "../queries/reportes.queries.js";
import { ANIO_ACTUAL } from "../queries/licencias.queries.js";
import { TIPOS_LICENCIA } from "../middlewares/validarLicencia.middleware.js";
import { MENSAJES } from "../constantes/mensajes.js";
import { httpError } from "../utils/httpError.js";

/*
  Reportes sobre el historial inmutable (asignacion_horario_historial).
  Nota de diseño: el historial guarda datos operativos + nombres en
  claro (proporcionalidad Ley 25.326), por lo que estos reportes se
  resuelven 100% en SQL sin descifrar nada.
*/

/*
  Valores de asignacion_horario_historial.estado_asistencia.
  'LICENCIA' es heredado: el archivado ya guarda el tipo de licencia, pero
  puede haber filas viejas con el valor genérico.
*/
const ESTADOS_ASISTENCIA = [
  "PRESENTE",
  "RETIRO_ENFERMEDAD",
  "INCOMPLETO",
  "AUSENTE",
  "ENFERMEDAD",
  "VACACIONES",
  "ESPECIAL",
  "LICENCIA",
];

export const getHistorial = async ({
  desde = null,
  hasta = null,
  empleado = null,
  puesto = null,
  asistencia = null
}) => {
  if (asistencia && !ESTADOS_ASISTENCIA.includes(asistencia)) {
    throw httpError(400, MENSAJES.REPORTES.ASISTENCIA_INVALIDA);
  }

  const result = await pool.query(Queries.GET_HISTORIAL, [desde, hasta, empleado, puesto, asistencia]);
  return result.rows;
};

export const getHorasTrabajadas = async ({ desde, hasta }) => {
  const result = await pool.query(Queries.GET_HORAS_TRABAJADAS, [desde, hasta]);
  return result.rows;
};

const DIAS_MAXIMOS_PERIODO = 366;

export const getDotacionPeriodo = async ({ desde, hasta }) => {
  if (!desde || !hasta) {
    throw httpError(400, MENSAJES.REPORTES.PERIODO_REQUERIDO);
  }

  const dias = (Date.parse(hasta) - Date.parse(desde)) / 86_400_000;

  if (Number.isNaN(dias) || dias < 0 || dias > DIAS_MAXIMOS_PERIODO) {
    throw httpError(400, MENSAJES.REPORTES.PERIODO_INVALIDO);
  }

  const result = await pool.query(Queries.GET_DOTACION_PERIODO, [desde, hasta]);
  return result.rows.map((fila) => ({
    ...fila,
    // COUNT devuelve bigint, que pg entrega como string
    empleados: Number(fila.empleados),
    turnos: Number(fila.turnos),
    asignaciones: Number(fila.asignaciones)
  }));
};

export const getLicencias = async ({
  desde = null,
  hasta = null,
  empleado = null,
  puesto = null,
  tipo = null
}) => {
  if (tipo && !TIPOS_LICENCIA.includes(tipo)) {
    throw httpError(400, MENSAJES.REPORTES.TIPO_LICENCIA_INVALIDO);
  }

  const result = await pool.query(Queries.GET_LICENCIAS_PERIODO, [desde, hasta, empleado, puesto, tipo]);
  return result.rows;
};

const ANIO_MINIMO = 2000;
const ANIO_MAXIMO = 2100;

/*
  Saldo de vacaciones del año. Sin año válido se usa el argentino actual,
  con el mismo criterio que resolverAnio en licencias.services.js.
*/
export const getSaldoVacaciones = async ({ anio }) => {
  const numero = Number(anio);
  const anioValido =
    Number.isInteger(numero) && numero >= ANIO_MINIMO && numero <= ANIO_MAXIMO
      ? numero
      : (await pool.query(ANIO_ACTUAL)).rows[0].anio;

  const result = await pool.query(Queries.GET_SALDO_VACACIONES, [anioValido]);
  return { anio: anioValido, saldos: result.rows };
};

export const getDotacion = async () => {
  const result = await pool.query(Queries.GET_DOTACION);
  return result.rows;
};
