import * as horariosService from '../services/horarios.services.js';

export const getHorariosPorEmpleado = async (req, res) => {
  try {
    const horarios = await horariosService.getHorariosPorEmpleado(req.params.id);
    res.json(horarios);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getEmpleadosAsignadosATurno = async (req, res) => {
  try {
    const empleados = await horariosService.getEmpleadosAsignadosATurno(req.params.id);
    res.json(empleados);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const asignarEmpleadoATurno = async (req, res) => {
  try {
    const { id_empleado, id_calendario } = req.body;

    if (!id_empleado || !id_calendario) {
      return res.status(400).json({
        error: "id_empleado e id_calendario son obligatorios"
      });
    }

    const resultado = await horariosService.asignarTurnoConHistorial(
      id_empleado,
      id_calendario
    );

    res.status(201).json(resultado);
  } catch (error) {
    if (error.message.includes("ya está asignado")) {
      return res.status(409).json({ error: error.message });
    }

    res.status(500).json({
      error: "Error interno del servidor"
    });
  }
};

export const eliminarAsignacionHorario = async (req, res) => {
  try {
    const { id_empleado, id_calendario } = req.params;
    await horariosService.eliminarAsignacionHorario(id_empleado, id_calendario);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const horariosPorFecha = async (req, res) => {
  try {
    const horarios = await horariosService.horariosPorFecha(req.params.fecha);
    res.json(horarios);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
