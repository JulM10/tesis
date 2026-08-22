import api from "../apis/axios";

export const getUsuarios = async () => {
  const response = await api.get("/usuarios");
  return response.data;
};

export const getRoles = async () => {
  const response = await api.get("/usuarios/roles");
  return response.data;
};

/**
 * Actualiza email, estado y/o rol: { email?, activo?, id_rol? }
 */
export const updateUsuario = async (id, data) => {
  const response = await api.put(`/usuarios/${id}`, data);
  return response.data;
};

/**
 * Resetea la contraseña a una temporal. Devuelve { data: { email, password_temporal } }.
 */
export const resetPassword = async (id) => {
  const response = await api.post(`/usuarios/${id}/reset-password`);
  return response.data;
};

export const deleteUsuario = async (id) => {
  const response = await api.delete(`/usuarios/${id}`);
  return response.data;
};
