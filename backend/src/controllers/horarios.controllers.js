import * as horariosService from "../services/horarios.services.js";
import { MENSAJES } from "../constantes/mensajes.js";
import { responderError } from "../utils/httpError.js";

/*
  La grilla (quién trabaja cuándo) la ve cualquiera con CALENDARIO_VER,
  pero la asistencia y las licencias de los demás solo RRHH y el
  administrador (EMPLEADOS_VER): una licencia por enfermedad es un dato
  de salud (Ley 25.326, art. 7). Cada empleado ve lo suyo en /api/me.
*/
const sinDatosDeAsistencia = ({ hora_ingreso, hora_egreso, licencia, ...resto }) => resto;

const filtrarSegunPermiso = (req, horarios) =>
  req.usuario.permisos?.includes("EMPLEADOS_VER")
    ? horarios
    : horarios.map(sinDatosDeAsistencia);

export const getHorariosPorEmpleado = async (req, res) => {
  try {
    const horarios = await horariosService.getHorariosPorEmpleado(req.params.id);
    res.json(filtrarSegunPermiso(req, horarios));
  } catch (error) {
    responderError(res, error);
  }
};

export const getAllHorarios = async (req, res) => {
  try {
    const horarios = await horariosService.getAllHorarios();
    res.json(filtrarSegunPermiso(req, horarios));
  } catch (error) {
    responderError(res, error);
  }
};

export const getEmpleadosAsignadosATurno = async (req, res) => {
  try {
    const empleados = await horariosService.getEmpleadosAsignadosATurno(req.params.id);
    res.json(empleados);
  } catch (error) {
    responderError(res, error);
  }
};

export const asignarEmpleadoATurno = async (req, res) => {
  try {
    const { id_empleado, id_calendario } = req.body;

    if (!id_empleado || !id_calendario) {
      return res.status(400).json({
        error: MENSAJES.VALIDACION.CAMPOS_OBLIGATORIOS
      });
    }

    const asignacion = await horariosService.asignarTurno(
      id_empleado,
      id_calendario
    );

    res.status(201).json({
      message: MENSAJES.HORARIOS.ASIGNADO_OK,
      data: asignacion
    });
  } catch (error) {
    responderError(res, error);
  }
};

export const eliminarAsignacionHorario = async (req, res) => {
  try {
    const { id_empleado, id_calendario } = req.params;

    await horariosService.eliminarAsignacionHorario(
      id_empleado,
      id_calendario
    );

    res.json({
      message: MENSAJES.HORARIOS.ELIMINADO_OK
    });
  } catch (error) {
    responderError(res, error);
  }
};

export const horariosPorFecha = async (req, res) => {
  try {
    const horarios = await horariosService.horariosPorFecha(req.params.fecha);
    res.json(filtrarSegunPermiso(req, horarios));
  } catch (error) {
    responderError(res, error);
  }
};
