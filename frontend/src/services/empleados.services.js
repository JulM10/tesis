import api from '../apis/axios';

export const getEmpleados = async () => {
  const response = await api.get('/empleados');
  return response.data;
};

/**
 * Listado con puesto, lugar de trabajo y estado ya resueltos (vista SQL)
 */
export const getEmpleadosDetalle = async () => {
  const response = await api.get('/empleados/detalle');
  return response.data;
};

export const createEmpleado = async (data) => {
  const response = await api.post('/empleados', data);
  return response.data;
};

export const updateEmpleado = async (id, data) => {
  const response = await api.put(`/empleados/${id}`, data);
  return response.data;
};

export const deleteEmpleado = async (id) => {
  const response = await api.delete(`/empleados/${id}`);
  return response.data;
};

/**
 * Catálogos para selects de formularios: { puestos, lugares, estados }
 */
export const getCatalogos = async () => {
  const response = await api.get('/catalogos');
  return response.data;
};
