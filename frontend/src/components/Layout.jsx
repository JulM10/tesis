import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

/**
 * Layout común de las pantallas autenticadas: header con navegación,
 * datos de sesión y logout.
 */
export default function Layout({ children }) {
  const { usuario, logout } = useAuth();
  const { pathname } = useLocation();

  const linkClass = (path) =>
    `px-3 py-2 rounded-md text-sm font-medium transition-colors ${
      pathname === path
        ? "bg-emerald-100 text-emerald-800"
        : "text-gray-600 hover:bg-gray-100"
    }`;

  return (
    <div className="min-h-screen w-full bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <span className="text-xl font-bold text-emerald-700">
              Hotel Yacanto
            </span>
            <nav className="flex gap-1">
              <Link className={linkClass("/")} to="/">
                Inicio
              </Link>
              <Link className={linkClass("/empleados")} to="/empleados">
                Empleados
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            {usuario.roles.map((rol) => (
              <Badge key={rol}>{rol}</Badge>
            ))}
            <span className="text-sm text-gray-500 hidden sm:inline">
              {usuario.email}
            </span>
            <Button variant="outline" size="sm" onClick={logout}>
              Cerrar sesión
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-6">{children}</main>
    </div>
  );
}
