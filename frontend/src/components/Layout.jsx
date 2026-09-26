import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

/*
  Layout común de las pantallas autenticadas: header con navegación,
  datos de sesión y logout.

  En una pantalla chica la barra no entra: los siete accesos, los roles, el
  email y el botón de salir piden cerca de 1000px. Por eso hasta `lg` se
  muestra un botón de menú que despliega una segunda fila con todo eso.

  El panel se dibuja DENTRO del flujo del documento, no como ventana
  flotante: así el orden de tabulación es el natural y no hace falta
  atrapar el foco ni tapar la pantalla con una capa.
*/

/*
  Un solo listado para las dos navegaciones (barra y panel): agregar una
  pantalla es una línea, y no puede quedar en una y faltar en la otra.
  Sin `permiso` significa que la ve cualquiera con sesión.
*/
const ENLACES = [
  { to: "/", texto: "Inicio", permiso: "EMPLEADOS_VER" },
  { to: "/empleados", texto: "Empleados", permiso: "EMPLEADOS_VER" },
  { to: "/calendario", texto: "Calendario" },
  { to: "/usuarios", texto: "Usuarios", permiso: "USUARIOS_VER" },
  { to: "/reportes", texto: "Reportes", permiso: "REPORTES_VER" },
  { to: "/mi-perfil", texto: "Mi perfil" },
  { to: "/configuracion", texto: "Configuración", permiso: "ESTABLECIMIENTO_EDITAR" },
];

export default function Layout({ children }) {
  const { usuario, logout, tienePermiso } = useAuth();
  const { pathname } = useLocation();
  const [menuAbierto, setMenuAbierto] = useState(false);

  useEffect(() => {
    // Escape cierra el menú, como cualquier panel desplegable.
    const alPresionarTecla = (evento) => {
      if (evento.key === "Escape") setMenuAbierto(false);
    };

    window.addEventListener("keydown", alPresionarTecla);
    return () => window.removeEventListener("keydown", alPresionarTecla);
  }, []);

  const enlacesVisibles = ENLACES.filter(
    (enlace) => !enlace.permiso || tienePermiso(enlace.permiso)
  );

  /*
    En el panel los accesos son más altos (44px) para tocarlos con el dedo;
    en la barra se achica el padding lateral para que los siete entren.
  */
  const linkClass = (path, enPanel = false) =>
    `rounded-md text-sm font-medium transition-colors ${
      enPanel ? "px-3 py-3" : "px-2 py-2 lg:px-3"
    } ${
      pathname === path
        ? "bg-emerald-100 text-emerald-800"
        : "text-gray-600 hover:bg-gray-100"
    }`;

  const roles = usuario.roles.map((rol) => <Badge key={rol}>{rol}</Badge>);

  return (
    <div className="min-h-screen w-full bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-2">
          <span className="min-w-0 truncate text-lg sm:text-xl font-bold text-emerald-700">
            Hotel Yacanto
          </span>

          <nav className="hidden lg:flex lg:gap-1">
            {enlacesVisibles.map((enlace) => (
              <Link key={enlace.to} className={linkClass(enlace.to)} to={enlace.to}>
                {enlace.texto}
              </Link>
            ))}
          </nav>

          <div className="hidden lg:flex items-center gap-3 shrink-0">
            {roles}
            {/* El email recién entra en pantallas anchas; en el panel se ve siempre */}
            <span className="hidden xl:inline max-w-56 truncate text-sm text-gray-500">
              {usuario.email}
            </span>
            <Button variant="outline" size="sm" onClick={logout}>
              Cerrar sesión
            </Button>
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 shrink-0 lg:hidden"
            aria-label={menuAbierto ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={menuAbierto}
            aria-controls="menu-principal"
            onClick={() => setMenuAbierto((abierto) => !abierto)}
          >
            {menuAbierto ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>

        {menuAbierto && (
          <div
            id="menu-principal"
            className="lg:hidden border-t border-gray-200 px-4 pb-4 pt-2"
          >
            <nav className="flex flex-col">
              {enlacesVisibles.map((enlace) => (
                <Link
                  key={enlace.to}
                  className={linkClass(enlace.to, true)}
                  to={enlace.to}
                  // Cerrar al tocar, y no en un efecto por cambio de ruta:
                  // eso último choca con react-hooks/set-state-in-effect.
                  onClick={() => setMenuAbierto(false)}
                >
                  {enlace.texto}
                </Link>
              ))}
            </nav>

            <div className="mt-3 space-y-3 border-t border-gray-100 pt-3">
              <div className="flex flex-wrap items-center gap-1">{roles}</div>
              <p className="break-all text-sm text-gray-500">{usuario.email}</p>
              <Button variant="outline" className="w-full" onClick={logout}>
                Cerrar sesión
              </Button>
            </div>
          </div>
        )}
      </header>

      <main className="max-w-6xl mx-auto px-4 py-4 sm:px-6 sm:py-6">{children}</main>
    </div>
  );
}
