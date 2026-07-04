import api from "../apis/axios";

/**
 * Obtener todos los horarios asignados (vista con empleado, puesto y turno)
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
 * Asignar empleado a turno: { id_empleado, id_calendario }
 */
export const asignarEmpleadoATurno = async (payload) => {
  const response = await api.post("/horarios/asignar", payload);
  return response.data;
};

/**
 * Quitar la asignación de un empleado a un turno
 */
export const eliminarAsignacion = async (idEmpleado, idCalendario) => {
  const response = await api.delete(`/horarios/asignar/${idEmpleado}/${idCalendario}`);
  return response.data;
};
