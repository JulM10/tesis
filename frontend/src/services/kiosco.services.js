import axios from "axios";

/*
  El kiosco no es un usuario: no manda el JWT ni pasa por los
  interceptores de apis/axios.js, que ante un 401 cierran la sesión y
  mandan al login. Acá un 401 significa "clave del kiosco incorrecta" y
  lo resuelve la propia pantalla del kiosco.
*/
const kiosco = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:3000/api",
});

/** Código vigente: { codigo, venceEn, periodo } */
export const getCodigoKiosco = async (clave) => {
  const response = await kiosco.get("/asistencia/codigo", {
    headers: { "X-Kiosco-Clave": clave },
  });
  return response.data;
};
