import { createContext, useContext, useState } from "react";
import { login as loginService } from "@/services/auth.services";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(() => {
    const guardado = localStorage.getItem("hy_usuario");
    return guardado ? JSON.parse(guardado) : null;
  });

  const login = async (email, password) => {
    const { token, usuario: usuarioLogueado } = await loginService({
      email,
      password
    });

    localStorage.setItem("hy_token", token);
    localStorage.setItem("hy_usuario", JSON.stringify(usuarioLogueado));
    setUsuario(usuarioLogueado);

    return usuarioLogueado;
  };

  const logout = () => {
    localStorage.removeItem("hy_token");
    localStorage.removeItem("hy_usuario");
    setUsuario(null);
  };

  const tienePermiso = (permiso) =>
    usuario?.permisos?.includes(permiso) ?? false;

  /*
    Chequeo por ROL, no por permiso. Se usa donde el criterio es el cargo
    y no una capacidad puntual: la gestión de usuarios queda reservada al
    administrador aunque RRHH tenga el permiso USUARIOS_EDITAR.
  */
  const tieneRol = (rol) => usuario?.roles?.includes(rol) ?? false;

  const esAdministrador = tieneRol("ADMINISTRADOR");

  return (
    <AuthContext.Provider
      value={{ usuario, login, logout, tienePermiso, tieneRol, esAdministrador }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
