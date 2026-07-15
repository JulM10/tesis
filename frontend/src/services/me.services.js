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

export const subirMiCV = async (archivo) => {
  const formData = new FormData();
  formData.append("cv", archivo);
  const response = await api.post("/me/cv", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
};

export const descargarMiCV = async () => {
  const response = await api.get("/me/cv", { responseType: "blob" });
  return response.data;
};
