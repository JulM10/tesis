import * as calendarioService from "../services/calendario.services.js";
import { MENSAJES } from "../constantes/mensajes.js";
import { responderError } from "../utils/httpError.js";

export const getCalendarios = async (req, res) => {
  try {
    const calendarios = await calendarioService.getObtenerCalendario();
    res.json(calendarios);
  } catch (error) {
    responderError(res, error);
  }
};

export const getCalendarioById = async (req, res) => {
  try {
    const calendario = await calendarioService.getObtenerCalendarioPorId(
      req.params.id
    );
    res.json(calendario);
  } catch (error) {
    responderError(res, error);
  }
};

export const LeerHorariosPorFecha = async (req, res) => {
  try {
    const horarios = await calendarioService.getLeerHorariosPorFecha(
      req.params.fecha
    );
    res.json(horarios);
  } catch (error) {
    responderError(res, error);
  }
};

export const LeerHorariosPorFechaYPuesto = async (req, res) => {
  try {
    const horarios =
      await calendarioService.getLeerHorariosPorFechaYPuesto(
        req.params.fecha,
        req.params.id_puesto
      );
    res.json(horarios);
  } catch (error) {
    responderError(res, error);
  }
};

export const createCalendario = async (req, res) => {
  try {
    const nuevoCalendario = await calendarioService.crearCalendario(req.body);

    res.status(201).json({
      message: MENSAJES.CALENDARIO.CREADO_OK,
      data: nuevoCalendario
    });
  } catch (error) {
    responderError(res, error);
  }
};

export const updateCalendario = async (req, res) => {
  try {
    const calendarioActualizado =
      await calendarioService.putActualizarCalendario(
        req.params.id,
        req.body
      );

    res.json({
      message: MENSAJES.CALENDARIO.ACTUALIZADO_OK,
      data: calendarioActualizado
    });
  } catch (error) {
    responderError(res, error);
  }
};

export const deleteCalendario = async (req, res) => {
  try {
    await calendarioService.deleteEliminarCalendario(req.params.id);

    res.json({
      message: MENSAJES.CALENDARIO.ELIMINADO_OK
    });
  } catch (error) {
    responderError(res, error);
  }
};
