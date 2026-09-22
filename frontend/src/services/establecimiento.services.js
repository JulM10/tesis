import api from '../apis/axios';

/*
  ABM de la estructura del hotel. El tipo es "puestos" o "lugares";
  cualquier otro valor lo rechaza el backend con 404.

  La LECTURA no está acá: sigue en getCatalogos() (empleados.services),
  que todas las pantallas ya usan para armar sus selects y filtros.
*/

// color: solo aplica a puestos; para lugares el backend lo ignora.
export const crearItem = async (tipo, nombre, color) => {
  const response = await api.post(`/establecimiento/${tipo}`, { nombre, color });
  return response.data;
};

export const editarItem = async (tipo, id, nombre, color) => {
  const response = await api.put(`/establecimiento/${tipo}/${id}`, { nombre, color });
  return response.data;
};

export const eliminarItem = async (tipo, id) => {
  const response = await api.delete(`/establecimiento/${tipo}/${id}`);
  return response.data;
};
