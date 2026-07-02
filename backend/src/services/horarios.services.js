import { pool } from "../config/database.js";
import * as Queries from "../queries/horarios.queries.js";
import { MENSAJES } from "../constantes/mensajes.js";
import { httpError } from "../utils/httpError.js";

const ejecutarQuery = async (client, query, params = []) => {
  if (!query) {
    throw new Error("Query SQL no definida");
  }

  try {
    return client
      ? await client.query(query, params)
      : await pool.query(query, params);
  } catch (error) {
    // No loguear params: pueden contener datos personales (Ley 25.326)
    console.error("[ejecutarQuery] Error SQL:", error.message);
    throw error;
  }
};

export const getHorariosPorEmpleado = async (id_empleado) => {
  const result = await pool.query(
    Queries.GETHorariosPorEmpleado,
    [id_empleado]
  );

  return result.rows;
};

export const getAllHorarios = async () => {
  const result = await pool.query(
    Queries.GETHorariosEmpleados
  );

  return result.rows;
};

export const getCalendarioPorId = async (id_calendario, client = null) => {
  const result = await ejecutarQuery(
    client,
    Queries.GET_CALENDARIO_POR_ID,
    [id_calendario]
  );

  if (!result.rows[0]) {
    throw httpError(404, MENSAJES.CALENDARIO.NO_ENCONTRADO);
  }

  return result.rows[0];
};

export const getEmpleadosAsignadosATurno = async (id_calendario) => {
  const result = await pool.query(
    Queries.GETEmpleadosAsignadosATurno,
    [id_calendario]
  );

  return result.rows;
};

export const validarAsignacionHorario = async (
  id_empleado,
  id_calendario,
  client = null
) => {
  const result = await ejecutarQuery(
    client,
    Queries.SelectValidacionHorarios,
    [id_empleado, id_calendario]
  );

  return result.rows.length > 0;
};

export const validarSolapamientoHorario = async (
  id_empleado,
  fecha,
  hora_inicio,
  hora_fin,
  client = null
) => {
  const result = await ejecutarQuery(
    client,
    Queries.VALIDAR_SOLAPAMIENTO_HORARIO,
    [id_empleado, fecha, hora_inicio, hora_fin]
  );

  return result.rows.length > 0;
};

export const asignarEmpleadoATurno = async (
  id_empleado,
  id_calendario,
  client = null
) => {
  const result = await ejecutarQuery(
    client,
    Queries.POSTAsignarHorario,
    [id_empleado, id_calendario]
  );

  return result.rows[0];
};

export const eliminarAsignacionHorario = async (
  id_empleado,
  id_calendario,
  client = null
) => {
  const result = await ejecutarQuery(
    client,
    Queries.DELETEAsignacionHorario,
    [id_empleado, id_calendario]
  );

  if (result.rowCount === 0) {
    throw httpError(404, MENSAJES.HORARIOS.NO_EXISTE_ASIGNACION);
  }
};

export const registrarHistorialHorario = async (
  id_empleado,
  id_calendario,
  client = null
) => {
  await ejecutarQuery(
    client,
    Queries.POSTHistorialHorarios,
    [id_calendario, id_empleado]
  );
};

export const asignarTurnoConHistorial = async (
  id_empleado,
  id_calendario
) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Lock de la fila del empleado: serializa asignaciones concurrentes
    // del mismo empleado y evita la race condition del check-then-insert
    // (dos requests simultáneas validando solapamiento a la vez).
    const empleado = await ejecutarQuery(
      client,
      Queries.LOCK_EMPLEADO,
      [id_empleado]
    );

    if (empleado.rowCount === 0) {
      throw httpError(404, MENSAJES.EMPLEADOS.NO_ENCONTRADO);
    }

    const existe = await validarAsignacionHorario(
      id_empleado,
      id_calendario,
      client
    );

    if (existe) {
      throw httpError(409, MENSAJES.HORARIOS.YA_ASIGNADO);
    }

    const calendario = await getCalendarioPorId(
      id_calendario,
      client
    );

    const solapado = await validarSolapamientoHorario(
      id_empleado,
      calendario.fecha,
      calendario.hora_inicio,
      calendario.hora_fin,
      client
    );

    if (solapado) {
      throw httpError(409, MENSAJES.HORARIOS.CONFLICTO_HORARIO);
    }

    const asignacion = await asignarEmpleadoATurno(
      id_empleado,
      id_calendario,
      client
    );

    await registrarHistorialHorario(
      id_empleado,
      id_calendario,
      client
    );

    await client.query("COMMIT");

    return asignacion;

  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};


export const horariosPorFecha = async (fecha) => {
  const result = await pool.query(
    Queries.GEThorariosPorFecha,
    [fecha]
  );

  return result.rows;
};
