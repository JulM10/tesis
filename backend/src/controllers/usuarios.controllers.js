import * as usuariosService from "../services/usuarios.services.js";
import { MENSAJES } from "../constantes/mensajes.js";
import { responderError } from "../utils/httpError.js";

export const getUsuarios = async (req, res) => {
  try {
    const usuarios = await usuariosService.getUsuarios();
    res.json(usuarios);
  } catch (error) {
    responderError(res, error);
  }
};

export const getRoles = async (req, res) => {
  try {
    const roles = await usuariosService.getRoles();
    res.json(roles);
  } catch (error) {
    responderError(res, error);
  }
};

export const createUsuario = async (req, res) => {
  try {
    const usuario = await usuariosService.createUsuario(req.body);

    res.status(201).json({
      message: MENSAJES.USUARIOS.CREADO_OK,
      data: usuario
    });
  } catch (error) {
    responderError(res, error);
  }
};

export const updateUsuario = async (req, res) => {
  try {
    const id = Number(req.params.id);

    // Nadie puede desactivarse a sí mismo (quedaría afuera del sistema)
    if (id === req.usuario.sub && req.body.activo === false) {
      return res.status(400).json({
        error: MENSAJES.USUARIOS.NO_AUTODESACTIVAR
      });
    }

    const usuario = await usuariosService.updateUsuario(id, req.body);

    res.json({
      message: MENSAJES.USUARIOS.ACTUALIZADO_OK,
      data: usuario
    });
  } catch (error) {
    responderError(res, error);
  }
};

export const deleteUsuario = async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (id === req.usuario.sub) {
      return res.status(400).json({
        error: MENSAJES.USUARIOS.NO_AUTOELIMINAR
      });
    }

    await usuariosService.deleteUsuario(id);

    res.json({
      message: MENSAJES.USUARIOS.ELIMINADO_OK
    });
  } catch (error) {
    responderError(res, error);
  }
};
