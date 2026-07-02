import api from "../apis/axios.js";

/**
 * Autentica contra el backend.
 * Devuelve { token, usuario: { id, email, roles, permisos } }
 */
export const login = async ({ email, password }) => {
  const response = await api.post("/auth/login", { email, password });
  return response.data;
};
