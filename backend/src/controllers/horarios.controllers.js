import * as horariosService from "../services/horarios.services.js";
import { MENSAJES } from "../constantes/mensajes.js";

export const getHorariosPorEmpleado = async (req, res) => {
  try {
    const horarios = await horariosService.getHorariosPorEmpleado(req.params.id);

    if (horarios.length === 0) {
      return res.status(404).json({
        error: "El empleado no tiene calendarios asignados"
      });
    }

    res.status(200).json(horarios);

  } catch (error) {
    console.error("[getHorariosPorEmpleado] Error real", error);

    res.status(500).json({
      error: MENSAJES.GENERAL.ERROR_INTERNO
    });
  }
};
export const getAllHorarios = async (req, res) => {
  try {
    const horarios = await horariosService.getAllHorarios();
    res.json(horarios);
  } catch (error) {
    res.status(500).json({ error: MENSAJES.GENERAL.ERROR_INTERNO });
  }
};

export const getEmpleadosAsignadosATurno = async (req, res) => {
  try {
    const empleados = await horariosService.getEmpleadosAsignadosATurno(req.params.id);
    res.json(empleados);
  } catch (error) {
    res.status(500).json({ error: MENSAJES.GENERAL.ERROR_INTERNO });
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

    const resultado = await horariosService.asignarTurnoConHistorial(
      id_empleado,
      id_calendario
    );

    res.status(201).json({
      message: MENSAJES.HORARIOS.ASIGNADO_OK,
      data: resultado
    });

  } catch (error) {
    console.error("[asignarEmpleadoATurno] ERROR CAPTURADO", {
      message: error.message,
      stack: error.stack,
      error
    });

    if (error.message === MENSAJES.HORARIOS.CONFLICTO_HORARIO) {
      return res.status(409).json({ error: error.message });
    }

    if (error.message === MENSAJES.HORARIOS.YA_ASIGNADO) {
      return res.status(409).json({ error: MENSAJES.HORARIOS.YA_ASIGNADO });
    }
    res.status(500).json({
      error: MENSAJES.GENERAL.ERROR_INTERNO,
      debug: error.message
    });
  }
};

export const eliminarAsignacionHorario = async (req, res) => {
  try {
    const { id_empleado, id_calendario } = req.params;

    await horariosService.eliminarAsignacionHorario(
      id_empleado,
      id_calendario
    );

    res.status(200).json({
      message: MENSAJES.HORARIOS.ELIMINADO_OK
    });
  } catch (error) {
    res.status(500).json({ error: MENSAJES.GENERAL.ERROR_INTERNO });
  }
};

export const horariosPorFecha = async (req, res) => {
  try {
    const horarios = await horariosService.horariosPorFecha(req.params.fecha);

    if (!horarios || horarios.length === 0) {
      return res.status(404).json({
        error: MENSAJES.HORARIOS.SIN_HORARIOS
      });
    }

    res.json(horarios);
  } catch (error) {
    res.status(500).json({ error: MENSAJES.GENERAL.ERROR_INTERNO });
  }
};
