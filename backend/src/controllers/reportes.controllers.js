import * as reportesService from "../services/reportes.services.js";
import { responderError } from "../utils/httpError.js";

const FECHA_VALIDA = /^\d{4}-\d{2}-\d{2}$/;

// Normaliza un query param de fecha: "" o inválido → null
const fechaONull = (valor) => (valor && FECHA_VALIDA.test(valor) ? valor : null);

export const getHistorial = async (req, res) => {
  try {
    const filas = await reportesService.getHistorial({
      desde: fechaONull(req.query.desde),
      hasta: fechaONull(req.query.hasta),
      empleado: req.query.empleado?.trim() || null,
      puesto: req.query.puesto?.trim() || null,
    });
    res.json(filas);
  } catch (error) {
    responderError(res, error);
  }
};

export const getHorasTrabajadas = async (req, res) => {
  try {
    // Sin rango explícito: últimos 30 días
    const hoy = new Date().toISOString().slice(0, 10);
    const hace30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);

    const filas = await reportesService.getHorasTrabajadas({
      desde: fechaONull(req.query.desde) ?? hace30,
      hasta: fechaONull(req.query.hasta) ?? hoy,
    });
    res.json(filas);
  } catch (error) {
    responderError(res, error);
  }
};

export const getDotacion = async (req, res) => {
  try {
    const filas = await reportesService.getDotacion();
    res.json(filas);
  } catch (error) {
    responderError(res, error);
  }
};
