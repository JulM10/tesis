import { createContext, useContext, useState } from "react";
import {
  login as loginService,
  renovarSesion as renovarSesionService,
} from "@/services/auth.services";

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

  /*
    Cambia el token por uno nuevo sin pasar por el login. El backend
    relee roles y permisos, así que también sirve para que un cambio de
    permisos se refleje sin cerrar sesión.
  */
  const renovarSesion = async () => {
    const { token, usuario: usuarioRenovado } = await renovarSesionService();

    localStorage.setItem("hy_token", token);
    localStorage.setItem("hy_usuario", JSON.stringify(usuarioRenovado));
    setUsuario(usuarioRenovado);
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
      value={{
        usuario,
        login,
        logout,
        renovarSesion,
        tienePermiso,
        tieneRol,
        esAdministrador,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
