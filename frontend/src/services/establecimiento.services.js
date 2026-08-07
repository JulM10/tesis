import api from '../apis/axios';

/*
  ABM de la estructura del hotel. El tipo es "puestos" o "lugares";
  cualquier otro valor lo rechaza el backend con 404.

  La LECTURA no está acá: sigue en getCatalogos() (empleados.services),
  que todas las pantallas ya usan para armar sus selects y filtros.
*/

export const crearItem = async (tipo, nombre) => {
  const response = await api.post(`/establecimiento/${tipo}`, { nombre });
  return response.data;
};

export const editarItem = async (tipo, id, nombre) => {
  const response = await api.put(`/establecimiento/${tipo}/${id}`, { nombre });
  return response.data;
};

export const eliminarItem = async (tipo, id) => {
  const response = await api.delete(`/establecimiento/${tipo}/${id}`);
  return response.data;
};
