import api from "../apis/axios";

/**
 * Obtener todos los horarios
 */
export const getAllHorarios = async () => {
  const response = await api.get("/horarios");
  return response.data;
};

/**
 * Obtener horarios por empleado
 */
export const getHorariosPorEmpleado = async (idEmpleado) => {
  const response = await api.get(`/horarios/empleado/${idEmpleado}`);
  return response.data;
};

/**
 * Asignar empleado a turno
 */
export const asignarEmpleadoATurno = async (payload) => {
  const response = await api.post("/horarios/asignar", payload);
  return response.data;
};
