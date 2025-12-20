import {pool} from "../config/database.js";
import * as Queries from "../queries/calendario.queries.js";

export const getObtenerCalendario = async () => {
    const result =  await pool.query(Queries.GETObtenerCalendario);
    return result.rows;
};

export const getObtenerCalendarioPorId = async (id) => {
    const result = await pool.query(Queries.GETObtenerCalendarioPorId, [id]);
    return result.rows[0];
};

export const getLeerHorariosPorFecha = async (fecha) => {
    const result = await pool.query(Queries.GETLeerHorariosPorFecha, [fecha]);
    return result.rows;
};

export const getLeerHorariosPorFechaYPuesto = async (fecha, id_puesto) => {
    const result = await pool.query(Queries.GETLeerHorariosPorFechaYPuesto, [fecha, id_puesto]);
    return result.rows;
};

export const crearCalendario = async (calendario) => {
    const {fecha, hora_inicio, hora_fin, id_puesto} = calendario;
    const result = await pool.query(Queries.CrearCalendario, [fecha, hora_inicio, hora_fin, id_puesto]);
    return result.rows[0];
};

export const putActualizarCalendario = async (id, calendario) => {
    const {fecha, hora_inicio, hora_fin, id_puesto} = calendario;
    const result = await pool.query(Queries.PUTActualizarCalendario, [fecha, hora_inicio, hora_fin, id_puesto, id]);
    return result.rows[0];
};

export const deleteEliminarCalendario = async (id) => {
    await pool.query(Queries.DELETEEliminarCalendario, [id]);
};

