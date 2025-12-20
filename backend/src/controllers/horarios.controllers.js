import e from 'express';
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
        const asignacionExistente = await horariosService.validarAsignacionHorario(id_empleado, id_calendario);
        if (asignacionExistente) {
            return res.status(400).json({ error: 'El empleado ya está asignado a este turno.' });
        }
        const nuevaAsignacion = await horariosService.asignarEmpleadoATurno(id_empleado, id_calendario);
        await horariosService.registrarHistorialHorario(id_empleado, id_calendario);
        res.status(201).json(nuevaAsignacion);
    } catch (error) {
        res.status(500).json({ error: error.message });
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