import * as authService from "../services/auth.services.js";
import { MENSAJES } from "../constantes/mensajes.js";

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: MENSAJES.VALIDACION.CAMPOS_OBLIGATORIOS
      });
    }

    const resultado = await authService.login(email, password);

    res.json(resultado);
  } catch (error) {
    res.status(error.status || 500).json({
      error: error.status ? error.message : MENSAJES.GENERAL.ERROR_INTERNO
    });
  }
};
