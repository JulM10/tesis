import * as empleadosService from "../services/empleados.services.js";

export const getEmpleados = async (req, res) => {
  try {
    const empleados = await empleadosService.getAllEmpleados();
    res.json(empleados);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getEmpleadoById = async (req, res) => {
  try {
    const empleado = await empleadosService.getEmpleadoById(req.params.id);
    res.json(empleado);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const createEmpleado = async (req, res) => {
  try {
    const newEmpleado = await empleadosService.createEmpleado(req.body);
    res.status(201).json(newEmpleado);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const updateEmpleado = async (req, res) => {
  try {
    const updatedEmpleado = await empleadosService.updateEmpleado(req.params.id, req.body);
    res.json(updatedEmpleado);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteEmpleado = async (req, res) => {
  try {
    await empleadosService.deleteEmpleado(req.  params.id);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
