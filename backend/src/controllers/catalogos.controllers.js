import * as catalogosService from "../services/catalogos.services.js";
import { responderError } from "../utils/httpError.js";

export const getCatalogos = async (req, res) => {
  try {
    const catalogos = await catalogosService.getCatalogos();
    res.json(catalogos);
  } catch (error) {
    responderError(res, error);
  }
};
