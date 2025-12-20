import {pool} from "../config/database.js";
import * as Queries from "../queries/horarios.queries.js";

export const getHorariosPorEmpleado = async (id_empleado) => {
    const result = await pool.query(Queries.GETHorariosPorEmpleado, [id_empleado]);
    return result.rows;
};
export const getEmpleadosAsignadosATurno = async (id_calendario) => {
    const result = await pool.query(Queries.GETEmpleadosAsignadosATurno, [id_calendario]);
    return result.rows;
};
export const asignarEmpleadoATurno = async (id_empleado, id_calendario) => {
    const result = await pool.query(Queries.POSTAsignarEmpleadoATurno, [id_empleado, id_calendario]);
    return result.rows[0];
}
export const eliminarAsignacionHorario = async (id_empleado, id_calendario) => {
    await pool.query(Queries.DELETEAsignacionHorario, [id_empleado, id_calendario]);
}
export const validarAsignacionHorario = async (id_empleado, id_calendario) => {
    const result = await pool.query(Queries.SelectValidacionHorarios, [id_empleado, id_calendario]);
    return result.rows.length > 0;
}
export const registrarHistorialHorario = async (id_empleado, id_calendario) => {
    await pool.query(Queries.POSTHistorialHorarios, [id_empleado, id_calendario]);
}
export const horariosPorFecha = async (fecha) => {
    const result = await pool.query(Queries.GEThorariosPorFecha, [fecha]);
    return result.rows;
};
