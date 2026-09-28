import * as licenciasService from "../services/licencias.services.js";
import { MENSAJES } from "../constantes/mensajes.js";
import { responderError } from "../utils/httpError.js";

export const getLicencias = async (req, res) => {
  try {
    const licencias = await licenciasService.getLicencias(req.params.id, req.query.anio);
    res.json(licencias);
  } catch (error) {
    responderError(res, error);
  }
};

export const crearLicencia = async (req, res) => {
  try {
    // El id del usuario queda guardado: es la única traza de quién la cargó.
    const { advertencia, ...licencia } = await licenciasService.crearLicencia(
      req.params.id,
      req.body,
      req.usuario.sub
    );

    res.status(201).json({
      message: MENSAJES.LICENCIAS.CREADA_OK,
      advertencia,
      data: licencia
    });
  } catch (error) {
    responderError(res, error);
  }
};

export const eliminarLicencia = async (req, res) => {
  try {
    await licenciasService.eliminarLicencia(req.params.id, req.params.idLicencia);

    res.json({
      message: MENSAJES.LICENCIAS.ELIMINADA_OK
    });
  } catch (error) {
    responderError(res, error);
  }
};
