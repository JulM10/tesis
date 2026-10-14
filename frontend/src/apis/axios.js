import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:3000/api",
  headers: {
    "Content-Type": "application/json"
  }
});

// Adjunta el JWT a cada request si hay sesión activa
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("hy_token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const esLogin = error.config?.url?.includes("/auth/login");
    /*
      El 401 de cambiar-password significa "la contraseña actual no
      coincide", no una sesión caída: el backend usa el mismo código y el
      mismo texto para ambos casos. Sin esta excepción, un error de tipeo
      al cambiar la contraseña cerraría la sesión y mandaría al login.
    */
    const esCambioPassword = error.config?.url?.includes("/auth/cambiar-password");

    // Token vencido o inválido: cerrar sesión y volver al login.
    // Se excluyen los dos casos de arriba, donde el 401 es del dato tipeado.
    if (error.response?.status === 401 && !esLogin && !esCambioPassword) {
      localStorage.removeItem("hy_token");
      localStorage.removeItem("hy_usuario");

      const { pathname, search } = window.location;

      if (pathname !== "/login") {
        // Después del login se vuelve a donde estaba (ver login.jsx)
        const volver = pathname === "/" ? "" : `?volver=${encodeURIComponent(pathname + search)}`;
        window.location.href = `/login${volver}`;
      }
    }

    return Promise.reject(error);
  }
);

export default api;
