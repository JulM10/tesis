import { pool } from "../config/database.js";
import * as Queries from "../queries/asistencia.queries.js";
import { MENSAJES } from "../constantes/mensajes.js";
import { httpError } from "../utils/httpError.js";
import { codigoValido } from "../utils/codigoAsistencia.js";

/* =====================================================
   Reglas de marcado
   ===================================================== */

// El ingreso se acepta desde media hora antes del inicio del turno...
const ANTICIPO_INGRESO = 30 * 60;
// ...la salida, hasta una hora después del fin...
const MARGEN_EGRESO = 60 * 60;
// ...y no antes de 5 minutos del ingreso: un doble escaneo sin querer
// no puede cerrar el turno.
const MINIMO_ENTRE_MARCAS = 5 * 60;

// Horas "HH:MM:SS" (así devuelve pg las columnas TIME) a segundos del día.
const aSegundos = (hora) => {
  const [h, m, s = 0] = String(hora).split(":").map(Number);
  return h * 3600 + m * 60 + s;
};

const aHora = (segundos) => {
  const total = Math.max(0, segundos);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
};

const horaCorta = (hora) => String(hora).slice(0, 5);

/* =====================================================
   Límite de intentos
   Un código de 6 dígitos se adivina por fuerza bruta si se puede probar
   sin límite. Con 5 intentos cada 15 minutos, la chance de acertar es
   de 5 en un millón por cuarto de hora.
   El contador vive en memoria: si el servidor se reinicia, se pierde.
   Es aceptable para un solo servidor; con varios habría que llevarlo a
   la base de datos o a un almacenamiento compartido.
   ===================================================== */

const MAX_FALLOS = 5;
const VENTANA_FALLOS_MS = 15 * 60 * 1000;
const fallos = new Map(); // idUsuario → { cantidad, desde }

const registroVigente = (idUsuario, ahora) => {
  const registro = fallos.get(idUsuario);

  if (registro && ahora - registro.desde > VENTANA_FALLOS_MS) {
    fallos.delete(idUsuario);
    return null;
  }

  return registro ?? null;
};

const verificarBloqueo = (idUsuario, ahora) => {
  const registro = registroVigente(idUsuario, ahora);

  if (registro && registro.cantidad >= MAX_FALLOS) {
    const minutos = Math.ceil((registro.desde + VENTANA_FALLOS_MS - ahora) / 60000);
    throw httpError(429, MENSAJES.ASISTENCIA.DEMASIADOS_INTENTOS(minutos));
  }
};

const registrarFallo = (idUsuario, ahora) => {
  const registro = registroVigente(idUsuario, ahora) ?? { cantidad: 0, desde: ahora };
  registro.cantidad += 1;
  fallos.set(idUsuario, registro);
  return MAX_FALLOS - registro.cantidad;
};

/* =====================================================
   Marcado del empleado (POST /api/me/asistencia)
   ===================================================== */

/*
  Decide qué significa la marca según el estado de los turnos de hoy:
  1. Si hay un turno con ingreso y sin salida, todavía dentro del margen,
     es la SALIDA de ese turno.
  2. Si no, si hay un turno sin ingreso cuya ventana está abierta, es el
     INGRESO.
  3. Si no hay nada para marcar, explica por qué.
  Así el empleado tiene un solo botón y no puede equivocarse de tipo.
*/
const elegirMarca = (turnos, ahora) => {
  const abierto = turnos.find(
    (t) => t.hora_ingreso && !t.hora_egreso && ahora <= aSegundos(t.hora_fin) + MARGEN_EGRESO
  );

  if (abierto) {
    if (ahora - aSegundos(abierto.hora_ingreso) < MINIMO_ENTRE_MARCAS) {
      throw httpError(409, MENSAJES.ASISTENCIA.INGRESO_RECIENTE(horaCorta(abierto.hora_ingreso)));
    }
    return { tipo: "EGRESO", turno: abierto };
  }

  const porIngresar = turnos.find(
    (t) =>
      !t.hora_ingreso &&
      ahora >= aSegundos(t.hora_inicio) - ANTICIPO_INGRESO &&
      ahora <= aSegundos(t.hora_fin)
  );

  if (porIngresar) {
    return { tipo: "INGRESO", turno: porIngresar };
  }

  if (turnos.length === 0) {
    throw httpError(409, MENSAJES.ASISTENCIA.SIN_TURNO_HOY);
  }

  const proximo = turnos.find(
    (t) => !t.hora_ingreso && ahora < aSegundos(t.hora_inicio) - ANTICIPO_INGRESO
  );

  if (proximo) {
    const inicio = aSegundos(proximo.hora_inicio);
    throw httpError(409, MENSAJES.ASISTENCIA.TODAVIA_NO(aHora(inicio - ANTICIPO_INGRESO), aHora(inicio)));
  }

  const sinSalida = turnos.find((t) => t.hora_ingreso && !t.hora_egreso);

  if (sinSalida) {
    throw httpError(409, MENSAJES.ASISTENCIA.EGRESO_FUERA_DE_HORARIO(horaCorta(sinSalida.hora_fin)));
  }

  const completo = turnos.find(
    (t) => t.hora_egreso && ahora <= aSegundos(t.hora_fin) + MARGEN_EGRESO
  );

  if (completo) {
    throw httpError(409, MENSAJES.ASISTENCIA.TURNO_COMPLETO(
      horaCorta(completo.hora_ingreso),
      horaCorta(completo.hora_egreso)
    ));
  }

  throw httpError(409, MENSAJES.ASISTENCIA.TURNOS_CERRADOS);
};

export const marcar = async (idEmpleado, idUsuario, codigo) => {
  const codigoTexto = String(codigo ?? "").trim();

  if (!/^\d{6}$/.test(codigoTexto)) {
    throw httpError(400, MENSAJES.ASISTENCIA.CODIGO_FORMATO);
  }

  const ahoraMs = Date.now();
  verificarBloqueo(idUsuario, ahoraMs);

  // El código se valida antes que cualquier regla de negocio: sin un
  // código vigente no se revela nada, ni siquiera si hay turno hoy.
  if (!codigoValido(codigoTexto, ahoraMs)) {
    const restantes = registrarFallo(idUsuario, ahoraMs);
    throw httpError(400, MENSAJES.ASISTENCIA.CODIGO_INVALIDO(restantes));
  }

  fallos.delete(idUsuario);

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const { fecha, hora } = (await client.query(Queries.AHORA_LOCAL)).rows[0];

    const licencia = await client.query(Queries.LICENCIA_EN_FECHA, [idEmpleado, fecha]);
    if (licencia.rowCount > 0) {
      throw httpError(409, MENSAJES.ASISTENCIA.EN_LICENCIA);
    }

    const turnos = (await client.query(Queries.TURNOS_DEL_DIA, [idEmpleado, fecha])).rows;
    const { tipo, turno } = elegirMarca(turnos, aSegundos(hora));

    await client.query(
      tipo === "INGRESO" ? Queries.REGISTRAR_INGRESO : Queries.REGISTRAR_EGRESO,
      [turno.id, hora]
    );

    await client.query("COMMIT");

    return {
      tipo,
      hora: horaCorta(hora),
      turno: {
        fecha,
        hora_inicio: turno.hora_inicio,
        hora_fin: turno.hora_fin,
        puesto: turno.puesto
      }
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

/* =====================================================
   Corrección de RRHH
   (PUT /api/horarios/asignar/:id_empleado/:id_calendario/asistencia)
   ===================================================== */

const HORA_REGEX = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;

// "" o null → null (borra la marca); "08:05" → "08:05:00"
const normalizarHora = (valor) => {
  if (valor === undefined || valor === null || String(valor).trim() === "") {
    return null;
  }

  const texto = String(valor).trim();

  if (!HORA_REGEX.test(texto)) {
    throw httpError(400, MENSAJES.ASISTENCIA.HORA_INVALIDA);
  }

  return texto.length === 5 ? `${texto}:00` : texto;
};

/*
  RRHH carga o corrige las marcas de un turno: el empleado se olvidó de
  marcar, se quedó sin batería, etc. Solo turnos de hoy o anteriores que
  todavía no pasaron al historial (el archivado deja un día de gracia).
  Las faltas justificadas no se cargan acá: son licencias.
*/
export const corregir = async (idEmpleado, idCalendario, datos) => {
  if (![idEmpleado, idCalendario].every((id) => /^\d+$/.test(String(id)))) {
    throw httpError(400, MENSAJES.VALIDACION.ID_INVALIDO);
  }

  const horaIngreso = normalizarHora(datos?.hora_ingreso);
  const horaEgreso = normalizarHora(datos?.hora_egreso);

  if (horaEgreso && !horaIngreso) {
    throw httpError(400, MENSAJES.ASISTENCIA.EGRESO_SIN_INGRESO);
  }

  if (horaEgreso && aSegundos(horaEgreso) <= aSegundos(horaIngreso)) {
    throw httpError(400, MENSAJES.ASISTENCIA.EGRESO_ANTERIOR);
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const asignacion = (
      await client.query(Queries.ASIGNACION_PARA_CORREGIR, [idEmpleado, idCalendario])
    ).rows[0];

    if (!asignacion) {
      throw httpError(404, MENSAJES.HORARIOS.NO_EXISTE_ASIGNACION);
    }
    if (asignacion.futuro) {
      throw httpError(409, MENSAJES.ASISTENCIA.TURNO_FUTURO);
    }
    if (asignacion.archivado) {
      throw httpError(409, MENSAJES.ASISTENCIA.TURNO_ARCHIVADO);
    }
    if (asignacion.con_licencia) {
      throw httpError(409, MENSAJES.ASISTENCIA.CON_LICENCIA);
    }

    const result = await client.query(Queries.CORREGIR_ASISTENCIA, [
      asignacion.id,
      horaIngreso,
      horaEgreso
    ]);

    await client.query("COMMIT");

    return result.rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};
