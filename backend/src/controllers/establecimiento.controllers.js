import * as establecimientoService from "../services/establecimiento.services.js";
import { responderError } from "../utils/httpError.js";
import { MENSAJES } from "../constantes/mensajes.js";

export const crear = async (req, res) => {
  try {
    const creado = await establecimientoService.crear(req.params.tipo, req.body.nombre);
    res.status(201).json({ mensaje: MENSAJES.ESTABLECIMIENTO.CREADO_OK, ...creado });
  } catch (error) {
    responderError(res, error);
  }
};

export const editar = async (req, res) => {
  try {
    const actualizado = await establecimientoService.editar(
      req.params.tipo,
      req.params.id,
      req.body.nombre
    );
    res.json({ mensaje: MENSAJES.ESTABLECIMIENTO.ACTUALIZADO_OK, ...actualizado });
  } catch (error) {
    responderError(res, error);
  }
};

export const eliminar = async (req, res) => {
  try {
    await establecimientoService.eliminar(req.params.tipo, req.params.id);
    res.json({ mensaje: MENSAJES.ESTABLECIMIENTO.ELIMINADO_OK });
  } catch (error) {
    responderError(res, error);
  }
};
