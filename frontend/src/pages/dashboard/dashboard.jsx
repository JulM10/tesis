import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import HorariosTable from "@/components/HorariosTable";

/**
 * Dashboard placeholder: confirma sesión activa y consumo autenticado
 * de la API. Se reemplaza por el dashboard real (indicadores) en FASE 4.
 */
export default function Dashboard() {
  const { usuario, logout } = useAuth();

  return (
    <div className="w-full max-w-5xl p-6 space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-emerald-700">
            Hotel Yacanto
          </h1>
          <p className="text-sm text-gray-500">{usuario.email}</p>
        </div>

        <div className="flex items-center gap-2">
          {usuario.roles.map((rol) => (
            <Badge key={rol}>{rol}</Badge>
          ))}
          <Button variant="outline" onClick={logout}>
            Cerrar sesión
          </Button>
        </div>
      </header>

      <HorariosTable />
    </div>
  );
}
