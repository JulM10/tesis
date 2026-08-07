import api from "../apis/axios.js";

/**
 * Autentica contra el backend.
 * Devuelve { token, usuario: { id, email, roles, permisos } }
 */
export const login = async ({ email, password }) => {
  const response = await api.post("/auth/login", { email, password });
  return response.data;
};

/**
 * Pide un token nuevo para la sesión en curso (el JWT actual viaja en el
 * interceptor). Devuelve la misma forma que el login.
 */
export const renovarSesion = async () => {
  const response = await api.post("/auth/renovar");
  return response.data;
};

/**
 * Momento de vencimiento del token guardado, en milisegundos.
 * Devuelve null si no hay token o si no se puede leer.
 *
 * Lee el campo `exp` del payload sin verificar la firma: acá solo se usa
 * para decidir CUÁNDO renovar. Quien valida de verdad es el backend.
 */
export const vencimientoToken = () => {
  const token = localStorage.getItem("hy_token");

  if (!token) return null;

  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.exp ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
};
