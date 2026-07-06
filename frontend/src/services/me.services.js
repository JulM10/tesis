import api from "../apis/axios";

/**
 * Sesión actual + empleado vinculado (o null)
 */
export const getMe = async () => {
  const response = await api.get("/me");
  return response.data;
};

export const getMisHorarios = async () => {
  const response = await api.get("/me/horarios");
  return response.data;
};

/**
 * Autogestión: { telefono?, direccion?, notas? }
 */
export const updateMisDatos = async (data) => {
  const response = await api.put("/me", data);
  return response.data;
};
