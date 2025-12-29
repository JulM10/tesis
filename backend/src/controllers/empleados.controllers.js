import * as empleadosService from "../services/empleados.services.js";
import { MENSAJES } from "../constantes/mensajes.js";

export const getEmpleados = async (req, res) => {
  try {
    const empleados = await empleadosService.getAllEmpleados();
    res.json(empleados);
  } catch (error) {
    res.status(500).json({
      error: MENSAJES.GENERAL.ERROR_INTERNO
    });
  }
};

export const getEmpleadoById = async (req, res) => {
  try {
    const empleado = await empleadosService.getEmpleadoById(req.params.id);

    if (!empleado) {
      return res.status(404).json({
        error: MENSAJES.EMPLEADOS.NO_ENCONTRADO
      });
    }

    res.json(empleado);
  } catch (error) {
    res.status(500).json({
      error: MENSAJES.GENERAL.ERROR_INTERNO
    });
  }
};

export const createEmpleado = async (req, res) => {
  try {
    const empleadoCreado = await empleadosService.createEmpleado(req.body);

    res.status(201).json({
      message: MENSAJES.EMPLEADOS.CREADO_OK,
      data: empleadoCreado
    });
  } catch (error) {
    res.status(error.status || 500).json({
      message: error.message || MENSAJES.EMPLEADOS.No_Creado
    });
  }
};



export const updateEmpleado = async (req, res) => {
  try {
    const updatedEmpleado = await empleadosService.updateEmpleado(
      req.params.id,
      req.body
    );

    if (!updatedEmpleado) {
      return res.status(404).json({
        error: MENSAJES.EMPLEADOS.NO_ENCONTRADO
      });
    }

    res.json({
      message: MENSAJES.EMPLEADOS.ACTUALIZADO_OK,
      data: updatedEmpleado
    });
  } catch (error) {
    res.status(400).json({
      error: MENSAJES.GENERAL.ERROR_INTERNO
    });
  }
};

export const deleteEmpleado = async (req, res) => {
  try {
    await empleadosService.deleteEmpleado(req.params.id);

    res.json({
      message: MENSAJES.EMPLEADOS.ELIMINADO_OK
    });
  } catch (error) {
    res.status(404).json({
      error: MENSAJES.EMPLEADOS.NO_ENCONTRADO
    });
  }
};
