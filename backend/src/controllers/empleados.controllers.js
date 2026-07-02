import * as empleadosService from "../services/empleados.services.js";
import { MENSAJES } from "../constantes/mensajes.js";
import { responderError } from "../utils/httpError.js";

export const getEmpleados = async (req, res) => {
  try {
    const empleados = await empleadosService.getAllEmpleados();
    res.json(empleados);
  } catch (error) {
    responderError(res, error);
  }
};

export const getEmpleadoById = async (req, res) => {
  try {
    const empleado = await empleadosService.getEmpleadoById(req.params.id);
    res.json(empleado);
  } catch (error) {
    responderError(res, error);
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
    responderError(res, error);
  }
};

export const updateEmpleado = async (req, res) => {
  try {
    const empleadoActualizado = await empleadosService.updateEmpleado(
      req.params.id,
      req.body
    );

    res.json({
      message: MENSAJES.EMPLEADOS.ACTUALIZADO_OK,
      data: empleadoActualizado
    });
  } catch (error) {
    responderError(res, error);
  }
};

export const deleteEmpleado = async (req, res) => {
  try {
    await empleadosService.deleteEmpleado(req.params.id);

    res.json({
      message: MENSAJES.EMPLEADOS.ELIMINADO_OK
    });
  } catch (error) {
    responderError(res, error);
  }
};
