import * as calendarioService from "../services/calendario.services.js";
import { MENSAJES } from "../constantes/mensajes.js";

export const getCalendarios = async (req, res) => {
  try {
    const calendarios = await calendarioService.getObtenerCalendario();
    res.json(calendarios);
  } catch (error) {
    res.status(500).json({
      error: MENSAJES.GENERAL.ERROR_INTERNO
    });
  }
};

export const getCalendarioById = async (req, res) => {
  try {
    const calendario = await calendarioService.getObtenerCalendarioPorId(
      req.params.id
    );

    if (!calendario) {
      return res.status(404).json({
        error: MENSAJES.CALENDARIO.NO_ENCONTRADO
      });
    }

    res.json(calendario);
  } catch (error) {
    res.status(500).json({
      error: MENSAJES.GENERAL.ERROR_INTERNO
    });
  }
};

export const LeerHorariosPorFecha = async (req, res) => {
  try {
    const horarios = await calendarioService.getLeerHorariosPorFecha(
      req.params.fecha
    );

    if (!horarios || horarios.length === 0) {
      return res.status(404).json({
        error: MENSAJES.HORARIOS.SIN_HORARIOS
      });
    }

    res.json(horarios);
  } catch (error) {
    res.status(500).json({
      error: MENSAJES.GENERAL.ERROR_INTERNO
    });
  }
};

export const LeerHorariosPorFechaYPuesto = async (req, res) => {
  try {
    const horarios =
      await calendarioService.getLeerHorariosPorFechaYPuesto(
        req.params.fecha,
        req.params.id_puesto
      );

    if (!horarios || horarios.length === 0) {
      return res.status(404).json({
        error: MENSAJES.HORARIOS.SIN_HORARIOS
      });
    }

    res.json(horarios);
  } catch (error) {
    res.status(500).json({
      error: MENSAJES.GENERAL.ERROR_INTERNO
    });
  }
};

export const createCalendario = async (req, res) => {
  try {
    const newCalendario = await calendarioService.crearCalendario(req.body);

    res.status(201).json({
      message: MENSAJES.CALENDARIO.CREADO_OK,
      data: newCalendario
    });
  } catch (error) {
    res.status(400).json({
      error: MENSAJES.GENERAL.ERROR_INTERNO
    });
  }
};

export const updateCalendario = async (req, res) => {
  try {
    const updatedCalendario =
      await calendarioService.putActualizarCalendario(
        req.params.id,
        req.body
      );

    if (!updatedCalendario) {
      return res.status(404).json({
        error: MENSAJES.CALENDARIO.NO_ENCONTRADO
      });
    }

    res.json({
      message: MENSAJES.CALENDARIO.ACTUALIZADO_OK,
      data: updatedCalendario
    });
  } catch (error) {
    res.status(400).json({
      error: MENSAJES.GENERAL.ERROR_INTERNO
    });
  }
};

export const deleteCalendario = async (req, res) => {
  try {
    await calendarioService.deleteEliminarCalendario(req.params.id);

    res.json({
      message: MENSAJES.CALENDARIO.ELIMINADO_OK
    });
  } catch (error) {
    res.status(404).json({
      error: MENSAJES.CALENDARIO.NO_ENCONTRADO
    });
  }
};
