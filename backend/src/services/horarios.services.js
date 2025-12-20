import { pool } from "../config/database.js";
import * as Queries from "../queries/horarios.queries.js";

const ejecutarQuery = (client, query, params) => {
  return client ? client.query(query, params) : pool.query(query, params);
};

export const getHorariosPorEmpleado = async (id_empleado) => {
  const result = await pool.query(
    Queries.GETHorariosPorEmpleado,
    [id_empleado]
  );
  return result.rows;
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

export const asignarEmpleadoATurno = async (
  id_empleado,
  id_calendario,
  client = null
) => {
  const result = await ejecutarQuery(
    client,
    Queries.POSTAsignarEmpleadoATurno,
    [id_empleado, id_calendario]
  );
  return result.rows[0];
};

export const eliminarAsignacionHorario = async (
  id_empleado,
  id_calendario,
  client = null
) => {
  await ejecutarQuery(
    client,
    Queries.DELETEAsignacionHorario,
    [id_empleado, id_calendario]
  );
};

export const registrarHistorialHorario = async (
  id_empleado,
  id_calendario,
  client = null
) => {
  await ejecutarQuery(
    client,
    Queries.POSTHistorialHorarios,
    [id_empleado, id_calendario]
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
      throw new Error("El empleado ya está asignado a este turno");
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
      message: "Horario asignado correctamente",
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
  return result.rows;
};
