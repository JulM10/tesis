import { pool } from "../config/database.js";
import * as Queries from "../queries/horarios.queries.js";
import { MENSAJES } from "../constantes/mensajes.js";

const ejecutarQuery = async (client, query, params = []) => {
  if (!query) {
    console.error("[ejecutarQuery] Query SQL no definida", {
      params,
      client: !!client
    });
    throw new Error("Query SQL no definida");
  }

  try {
    console.log("[ejecutarQuery] Ejecutando query", {
      query,
      params,
      executor: client ? "CLIENT (transacción)" : "POOL"
    });

    const result = client
      ? await client.query(query, params)
      : await pool.query(query, params);

    console.log("[ejecutarQuery] Query OK", {
      rowCount: result.rowCount
    });

    return result;

  } catch (error) {
    console.error("[ejecutarQuery] ERROR SQL", {
      message: error.message,
      query,
      params,
      stack: error.stack
    });

    throw error; // 👈 IMPORTANTÍSIMO: no lo tapes
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

  if (result.rows.length === 0) {
    throw new Error(MENSAJES.HORARIOS.SIN_RESULTADOS);
  }
  return result.rows;
};

export const getCalendarioPorId = async (id_calendario, client = null) => {
  const result = await ejecutarQuery(
    client,
    Queries.GET_CALENDARIO_POR_ID,
    [id_calendario]
  );

  if (!result.rows[0]) {
    throw new Error(MENSAJES.CALENDARIO.NO_ENCONTRADO);
  }

  return result.rows[0];
};

export const getEmpleadosAsignadosATurno = async (id_calendario) => {
  const result = await pool.query(
    Queries.GETEmpleadosAsignadosATurno,
    [id_calendario]
  );

  if (result.rows.length === 0) {
    throw new Error(MENSAJES.HORARIOS.SIN_EMPLEADOS_ASIGNADOS);
  }

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
    throw new Error(MENSAJES.HORARIOS.NO_EXISTE_ASIGNACION);
  }

  return {
    message: MENSAJES.HORARIOS.ELIMINADO_OK
  };
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

    const existe = await validarAsignacionHorario(
      id_empleado,
      id_calendario,
      client
    );

    if (existe) {
      throw new Error(MENSAJES.HORARIOS.YA_ASIGNADO);
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
      throw new Error(MENSAJES.HORARIOS.CONFLICTO_HORARIO);
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

    return {
      message: MENSAJES.HORARIOS.ASIGNADO_OK,
      asignacion
    };

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

  if (result.rows.length === 0) {
    throw new Error(MENSAJES.HORARIOS.SIN_RESULTADOS_FECHA);
  }

  return result.rows;
};
