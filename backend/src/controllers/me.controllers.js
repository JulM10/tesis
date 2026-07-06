import * as meService from "../services/me.services.js";
import { MENSAJES } from "../constantes/mensajes.js";
import { responderError } from "../utils/httpError.js";

/**
 * Datos de la sesión + empleado vinculado (si existe)
 */
export const getMe = async (req, res) => {
  try {
    const empleado = await meService.getMiEmpleado(req.usuario.sub);

    res.json({
      usuario: {
        id: req.usuario.sub,
        email: req.usuario.email,
        roles: req.usuario.roles,
        permisos: req.usuario.permisos
      },
      empleado
    });
  } catch (error) {
    responderError(res, error);
  }
};

export const getMisHorarios = async (req, res) => {
  try {
    const horarios = await meService.getMisHorarios(req.usuario.sub);
    res.json(horarios);
  } catch (error) {
    responderError(res, error);
  }
};

export const updateMisDatos = async (req, res) => {
  try {
    const empleado = await meService.updateMisDatos(req.usuario.sub, req.body);

    res.json({
      message: MENSAJES.EMPLEADOS.ACTUALIZADO_OK,
      data: empleado
    });
  } catch (error) {
    responderError(res, error);
  }
};
