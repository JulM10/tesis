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

export const getEmpleadosDetalle = async (req, res) => {
  try {
    const empleados = await empleadosService.getEmpleadosDetalle();
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

export const subirCV = async (req, res) => {
  try {
    const resultado = await empleadosService.subirCV(req.params.id, req.file);

    res.status(201).json({
      message: MENSAJES.CV.SUBIDO_OK,
      data: resultado
    });
  } catch (error) {
    responderError(res, error);
  }
};

export const descargarCV = async (req, res) => {
  try {
    const { buffer, nombre, mime } = await empleadosService.descargarCV(req.params.id);

    res.setHeader("Content-Type", mime);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${encodeURIComponent(nombre)}"`
    );
    res.send(buffer);
  } catch (error) {
    responderError(res, error);
  }
};

export const eliminarCV = async (req, res) => {
  try {
    await empleadosService.eliminarCV(req.params.id);

    res.json({
      message: MENSAJES.CV.ELIMINADO_OK
    });
  } catch (error) {
    responderError(res, error);
  }
};
