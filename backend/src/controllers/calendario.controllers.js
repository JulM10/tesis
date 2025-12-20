import * as calendarioService from "../services/calendario.services.js";

export const getCalendarios = async (req, res) => {
  try {
    const calendarios = await calendarioService.getObtenerCalendario();
    res.json(calendarios);
    } catch (error) {
    res.status(500).json({ error: error.message });
    }
};

export const getCalendarioById = async (req, res) => {
  try {
    const calendario = await calendarioService.getObtenerCalendarioPorId(req.params.id);
    res.json(calendario);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const LeerHorariosPorFecha = async (req, res) => {
    try {
        const horarios = await calendarioService.getLeerHorariosPorFecha(req.params.fecha);
        res.json(horarios);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const LeerHorariosPorFechaYPuesto = async (req, res) => {
    try {
        const horarios = await calendarioService.getLeerHorariosPorFechaYPuesto(req.params.fecha, req.params.id_puesto);
        res.json(horarios);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const createCalendario = async (req, res) => {
  try {
    const newCalendario = await calendarioService.crearCalendario(req.body);
    res.status(201).json(newCalendario);
    } catch (error) {
    res.status(500).json({ error: error.message });
    }
};

export const updateCalendario = async (req, res) => {
  try {
    const updatedCalendario = await calendarioService.putActualizarCalendario(req.params.id, req.body); 
    res.json(updatedCalendario);
    } catch (error) {
    res.status(500).json({ error: error.message });
    }
};

export const deleteCalendario = async (req, res) => {
    try {
        await calendarioService.deleteEliminarCalendario(req.params.id);
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
