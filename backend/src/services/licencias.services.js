import { pool } from "../config/database.js";
import * as Queries from "../queries/licencias.queries.js";
import { MENSAJES } from "../constantes/mensajes.js";
import { httpError } from "../utils/httpError.js";
import { cifrar, descifrar } from "../utils/cifrado.js";
import { sincronizarEstadoLicencias } from "../database/licencias.js";

/*
  Licencias: vacaciones, enfermedad y especiales (LCT).

  Las tres comparten tabla, pero no reglas:
  - VACACIONES se planifica: descuenta del saldo anual y no se acepta si
    el empleado ya tiene turnos asignados en el rango (se informa cuáles;
    nada se borra en silencio).
  - ENFERMEDAD y ESPECIAL no se planifican: se aceptan aunque haya turnos
    asignados, y esos turnos pasan a figurar como licencia, no como ausencia.

  El comentario viaja cifrado a la base (puede contener datos de salud,
  Ley 25.326 art. 7) y se descifra al leer.
*/

const MS_POR_DIA = 24 * 60 * 60 * 1000;
const MAX_FECHAS_EN_MENSAJE = 5;

const descifrarLicencia = (fila) => ({
  ...fila,
  comentario: descifrar(fila.comentario),
});

// Ambas fechas son medianoche UTC al parsear AAAA-MM-DD: la resta es exacta.
const diasCorridos = (desde, hasta) =>
  (Date.parse(hasta) - Date.parse(desde)) / MS_POR_DIA + 1;

const resolverAnio = async (anio) => {
  const numero = Number(anio);

  if (Number.isInteger(numero) && numero >= 2000 && numero <= 2100) {
    return numero;
  }

  const result = await pool.query(Queries.ANIO_ACTUAL);
  return result.rows[0].anio;
};

export const getLicencias = async (idEmpleado, anio) => {
  const empleado = await pool.query(Queries.GET_DIAS_ANUALES, [idEmpleado]);

  if (!empleado.rows[0]) {
    throw httpError(404, MENSAJES.EMPLEADOS.NO_ENCONTRADO);
  }

  const anioSaldo = await resolverAnio(anio);

  const [licencias, usados] = await Promise.all([
    pool.query(Queries.GET_LICENCIAS, [idEmpleado]),
    pool.query(Queries.DIAS_VACACIONES_USADOS, [idEmpleado, anioSaldo]),
  ]);

  const diasAnuales = empleado.rows[0].dias_vacaciones_anuales;
  const diasUsados = usados.rows[0].usados;

  return {
    anio: anioSaldo,
    dias_anuales: diasAnuales,
    usados: diasUsados,
    disponibles: Math.max(0, diasAnuales - diasUsados),
    licencias: licencias.rows.map(descifrarLicencia),
  };
};

const validarVacaciones = async (client, idEmpleado, diasAnuales, desde, hasta) => {
  const dias = diasCorridos(desde, hasta);
  const anio = Number(desde.slice(0, 4));

  const usados = await client.query(Queries.DIAS_VACACIONES_USADOS, [idEmpleado, anio]);
  const disponibles = diasAnuales - usados.rows[0].usados;

  if (dias > disponibles) {
    throw httpError(409, MENSAJES.LICENCIAS.SALDO_INSUFICIENTE(Math.max(0, disponibles), anio, dias));
  }

  const turnos = await client.query(Queries.TURNOS_EN_RANGO, [idEmpleado, desde, hasta]);

  if (turnos.rowCount > 0) {
    const fechas = turnos.rows.slice(0, MAX_FECHAS_EN_MENSAJE).map((t) => t.fecha).join(", ");
    const resto = turnos.rowCount > MAX_FECHAS_EN_MENSAJE ? "…" : "";
    throw httpError(409, MENSAJES.LICENCIAS.TURNOS_ASIGNADOS(turnos.rowCount, fechas + resto));
  }
};

export const crearLicencia = async (idEmpleado, { tipo, fecha_desde, fecha_hasta, comentario }) => {
  const comentarioLimpio = comentario ? String(comentario).trim() || null : null;
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const empleado = await client.query(Queries.LOCK_EMPLEADO, [idEmpleado]);

    if (!empleado.rows[0]) {
      throw httpError(404, MENSAJES.EMPLEADOS.NO_ENCONTRADO);
    }

    const superpuesta = await client.query(Queries.LICENCIA_SUPERPUESTA, [
      idEmpleado,
      fecha_desde,
      fecha_hasta,
    ]);

    if (superpuesta.rowCount > 0) {
      throw httpError(409, MENSAJES.LICENCIAS.SUPERPUESTA);
    }

    if (tipo === "VACACIONES") {
      await validarVacaciones(
        client,
        idEmpleado,
        empleado.rows[0].dias_vacaciones_anuales,
        fecha_desde,
        fecha_hasta
      );
    }

    const result = await client.query(Queries.INSERT_LICENCIA, [
      idEmpleado,
      tipo,
      fecha_desde,
      fecha_hasta,
      cifrar(comentarioLimpio),
    ]);

    // Si la licencia cubre hoy, el estado del empleado cambia en el acto.
    await sincronizarEstadoLicencias(client);

    await client.query("COMMIT");

    return descifrarLicencia(result.rows[0]);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

export const eliminarLicencia = async (idEmpleado, idLicencia) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const result = await client.query(Queries.DELETE_LICENCIA, [idLicencia, idEmpleado]);

    if (result.rowCount === 0) {
      throw httpError(404, MENSAJES.LICENCIAS.NO_ENCONTRADA);
    }

    await sincronizarEstadoLicencias(client);

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};
