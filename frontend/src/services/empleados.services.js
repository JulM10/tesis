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

/* ===== Licencias (vacaciones, enfermedad, especiales) ===== */

/** { anio, dias_anuales, usados, disponibles, licencias } */
export const getLicencias = async (id) => {
  const response = await api.get(`/empleados/${id}/licencias`);
  return response.data;
};

/** { tipo, fecha_desde, fecha_hasta, comentario? } */
export const crearLicencia = async (id, data) => {
  const response = await api.post(`/empleados/${id}/licencias`, data);
  return response.data;
};

export const eliminarLicencia = async (id, idLicencia) => {
  const response = await api.delete(`/empleados/${id}/licencias/${idLicencia}`);
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

/**
 * Autocompletado de empleados: pide al menos 3 letras y devuelve
 * { id, nombre, apellido, puesto }. `signal` permite abortar la consulta
 * anterior cuando el usuario sigue escribiendo.
 */
export const buscarEmpleados = async (q, { limite = 8, signal } = {}) => {
  const response = await api.get('/empleados/buscar', { params: { q, limite }, signal });
  return response.data;
};
