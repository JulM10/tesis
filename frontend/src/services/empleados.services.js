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

/* ===== CV adjunto ===== */

export const subirCV = async (id, archivo) => {
  const formData = new FormData();
  formData.append('cv', archivo);
  const response = await api.post(`/empleados/${id}/cv`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

export const descargarCV = async (id) => {
  const response = await api.get(`/empleados/${id}/cv`, { responseType: 'blob' });
  return response.data;
};

export const eliminarCV = async (id) => {
  const response = await api.delete(`/empleados/${id}/cv`);
  return response.data;
};

/** Dispara la descarga de un blob en el navegador */
export const descargarBlob = (blob, nombre) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};
