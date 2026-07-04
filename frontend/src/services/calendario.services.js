import api from "../apis/axios";

/**
 * Obtener todos los turnos del calendario
 */
export const getCalendario = async () => {
  const response = await api.get("/calendario");
  return response.data;
};

/**
 * Crear un turno: { fecha, hora_inicio, hora_fin, id_puesto }
 */
export const createCalendario = async (data) => {
  const response = await api.post("/calendario", data);
  return response.data;
};

/**
 * Eliminar un turno (elimina en cascada sus asignaciones)
 */
export const deleteCalendario = async (id) => {
  const response = await api.delete(`/calendario/${id}`);
  return response.data;
};
