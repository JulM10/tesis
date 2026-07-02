import * as horariosService from "../services/horarios.services.js";
import { MENSAJES } from "../constantes/mensajes.js";
import { responderError } from "../utils/httpError.js";

export const getHorariosPorEmpleado = async (req, res) => {
  try {
    const horarios = await horariosService.getHorariosPorEmpleado(req.params.id);
    res.json(horarios);
  } catch (error) {
    responderError(res, error);
  }
};

export const getAllHorarios = async (req, res) => {
  try {
    const horarios = await horariosService.getAllHorarios();
    res.json(horarios);
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

    const asignacion = await horariosService.asignarTurnoConHistorial(
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
    res.json(horarios);
  } catch (error) {
    responderError(res, error);
  }
};
