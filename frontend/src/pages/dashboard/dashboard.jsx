import { useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { toast } from "sonner";
import { Users, UserCheck, Plane, CalendarDays } from "lucide-react";
import Layout from "@/components/Layout";
import { useAuth } from "@/context/AuthContext";
import { getEmpleadosDetalle, getCatalogos } from "@/services/empleados.services";
import { getCalendario } from "@/services/calendario.services";
import { getAllHorarios } from "@/services/horarios.services";
import {
  hoyISO,
  sumarDias,
  soloFecha,
  formatearFecha,
  horaCorta,
} from "@/lib/fechas";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

/** Tarjeta de indicador simple */
function StatCard({ titulo, valor, icono, color }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-4">
        <div className={`rounded-lg p-3 ${color}`}>{icono}</div>
        <div>
          <p className="text-2xl font-bold leading-none">{valor}</p>
          <p className="text-sm text-gray-500 mt-1">{titulo}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const { tienePermiso } = useAuth();
  const puedeVerGlobal = tienePermiso("EMPLEADOS_VER");

  const [empleados, setEmpleados] = useState([]);
  const [turnos, setTurnos] = useState([]);
  const [asignaciones, setAsignaciones] = useState([]);
  const [catalogos, setCatalogos] = useState({ puestos: [], lugares: [], estados: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!puedeVerGlobal) return;
    const cargar = async () => {
      try {
        const [listaEmpleados, listaTurnos, listaAsignaciones, listaCatalogos] =
          await Promise.all([
            getEmpleadosDetalle(),
            getCalendario(),
            getAllHorarios(),
            getCatalogos(),
          ]);
        setEmpleados(listaEmpleados);
        setTurnos(listaTurnos);
        setAsignaciones(listaAsignaciones);
        setCatalogos(listaCatalogos);
      } catch (error) {
        toast.error(error.response?.data?.error || "No se pudo cargar el panel");
      } finally {
        setLoading(false);
      }
    };
    cargar();
  }, [puedeVerGlobal]);

  const hoy = hoyISO();

  const indicadores = useMemo(() => {
    const porEstado = {};
    empleados.forEach((e) => {
      const estado = e.estado ?? "Sin estado";
      porEstado[estado] = (porEstado[estado] ?? 0) + 1;
    });
    return {
      total: empleados.length,
      activos: porEstado["Activo"] ?? 0,
      vacaciones: porEstado["Vacaciones"] ?? 0,
      porEstado,
    };
  }, [empleados]);

  const nombrePuesto = useMemo(() => {
    const mapa = {};
    catalogos.puestos.forEach((p) => (mapa[p.id] = p.nombre));
    return mapa;
  }, [catalogos]);

  const asignadosPorTurno = useMemo(() => {
    const mapa = {};
    asignaciones.forEach((a) => {
      (mapa[a.calendario_id] ??= []).push(a);
    });
    return mapa;
  }, [asignaciones]);

  const turnosHoy = useMemo(
    () =>
      turnos
        .filter((t) => soloFecha(t.fecha) === hoy)
        .sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio)),
    [turnos, hoy]
  );

  // Turnos de los próximos 7 días (sin incluir hoy)
  const proximosTurnos = useMemo(() => {
    const limite = sumarDias(hoy, 7);
    return turnos
      .filter((t) => {
        const fecha = soloFecha(t.fecha);
        return fecha > hoy && fecha <= limite;
      })
      .sort(
        (a, b) =>
          soloFecha(a.fecha).localeCompare(soloFecha(b.fecha)) ||
          a.hora_inicio.localeCompare(b.hora_inicio)
      )
      .slice(0, 8);
  }, [turnos, hoy]);

  const empleadosPorPuesto = useMemo(() => {
    const mapa = {};
    empleados.forEach((e) => {
      const puesto = e.puesto ?? "Sin puesto";
      mapa[puesto] = (mapa[puesto] ?? 0) + 1;
    });
    return Object.entries(mapa).sort((a, b) => b[1] - a[1]);
  }, [empleados]);

  const FilaTurno = ({ turno }) => {
    const asignados = asignadosPorTurno[turno.id] ?? [];
    return (
      <div className="flex items-start justify-between gap-2 rounded-md border border-gray-100 bg-gray-50 px-3 py-2">
        <div>
          <p className="text-sm font-semibold">
            {horaCorta(turno.hora_inicio)}–{horaCorta(turno.hora_fin)}
            {turno.id_puesto && (
              <span className="ml-2 font-normal text-emerald-700">
                {nombrePuesto[turno.id_puesto]}
              </span>
            )}
          </p>
          <p className="text-xs text-gray-500">
            {asignados.length > 0
              ? asignados.map((a) => `${a.empleado_nombre} ${a.empleado_apellido}`).join(", ")
              : "Sin empleados asignados"}
          </p>
        </div>
        <span className="text-xs text-gray-400 whitespace-nowrap">
          {formatearFecha(turno.fecha)}
        </span>
      </div>
    );
  };

  // Sin permiso de vista global: el inicio del empleado es su perfil
  if (!puedeVerGlobal) {
    return <Navigate to="/mi-perfil" replace />;
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold">Panel de Control</h2>
          <p className="text-sm text-gray-500">Hoy es {formatearFecha(hoy)}</p>
        </div>

        {loading ? (
          <p className="text-gray-500">Cargando panel...</p>
        ) : (
          <>
            {/* Indicadores */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                titulo="Total de empleados"
                valor={indicadores.total}
                icono={<Users className="h-6 w-6" />}
                color="bg-emerald-100 text-emerald-700"
              />
              <StatCard
                titulo="Empleados activos"
                valor={indicadores.activos}
                icono={<UserCheck className="h-6 w-6" />}
                color="bg-blue-100 text-blue-700"
              />
              <StatCard
                titulo="De vacaciones"
                valor={indicadores.vacaciones}
                icono={<Plane className="h-6 w-6" />}
                color="bg-yellow-100 text-yellow-700"
              />
              <StatCard
                titulo="Turnos hoy"
                valor={turnosHoy.length}
                icono={<CalendarDays className="h-6 w-6" />}
                color="bg-purple-100 text-purple-700"
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Turnos de hoy */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Turnos de hoy</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {turnosHoy.length === 0 && (
                    <p className="text-sm text-gray-400">
                      No hay turnos programados para hoy.{" "}
                      <Link to="/calendario" className="text-emerald-700 underline">
                        Ir al calendario
                      </Link>
                    </p>
                  )}
                  {turnosHoy.map((t) => (
                    <FilaTurno key={t.id} turno={t} />
                  ))}
                </CardContent>
              </Card>

              {/* Próximos turnos */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Próximos turnos (7 días)</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {proximosTurnos.length === 0 && (
                    <p className="text-sm text-gray-400">
                      No hay turnos programados para los próximos días.
                    </p>
                  )}
                  {proximosTurnos.map((t) => (
                    <FilaTurno key={t.id} turno={t} />
                  ))}
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Dotación por puesto */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Empleados por puesto</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {empleadosPorPuesto.map(([puesto, cantidad]) => (
                      <div key={puesto} className="flex items-center gap-2">
                        <span className="w-32 text-sm text-gray-600 truncate">{puesto}</span>
                        <div className="flex-1 bg-gray-100 rounded-full h-2.5">
                          <div
                            className="bg-emerald-500 h-2.5 rounded-full"
                            style={{ width: `${(cantidad / indicadores.total) * 100}%` }}
                          />
                        </div>
                        <span className="w-6 text-right text-sm font-semibold">{cantidad}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Dotación por estado */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Empleados por estado</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {Object.entries(indicadores.porEstado).map(([estado, cantidad]) => (
                      <div key={estado} className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">{estado}</span>
                        <span className="font-semibold">{cantidad}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
