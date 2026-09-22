import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { toast } from "sonner";
import {
  Clock,
  Download,
  Plane,
  Thermometer,
  UserCheck,
  Users,
  UserX,
} from "lucide-react";
import Layout from "@/components/Layout";
import { useAuth } from "@/context/AuthContext";
import {
  getReporteHistorial,
  getReporteHoras,
  getReporteDotacion,
  descargarCSV,
} from "@/services/reportes.services";
import { getCatalogos, getEmpleadosDetalle } from "@/services/empleados.services";
import { hoyISO, formatearFecha, horaCorta } from "@/lib/fechas";
import { ESTADOS_ASISTENCIA, ESTADOS_HISTORIAL, SIN_CONTROL } from "@/lib/asistencia";
import { PuntoAsistencia } from "@/components/EstadoAsistencia";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const REPORTES = [
  { id: "historial", nombre: "Historial de turnos" },
  { id: "horas", nombre: "Horas trabajadas" },
  { id: "dotacion", nombre: "Dotación" },
];

const hace30 = () =>
  new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

/*
  Totales por estado y antigüedad promedio del resumen de dotación.
  Se invoca al recibir el listado (no durante el render: usa Date.now(),
  que la regla react-hooks/purity prohíbe dentro de un useMemo).
*/
const calcularResumen = (empleados) => {
  const porEstado = {};
  empleados.forEach((e) => {
    const estado = e.estado ?? "Sin estado";
    porEstado[estado] = (porEstado[estado] ?? 0) + 1;
  });

  const MILIS_POR_ANIO = 1000 * 60 * 60 * 24 * 365.25;
  const conFecha = empleados.filter((e) => e.fecha_creacion);
  const antiguedad = conFecha.length
    ? conFecha.reduce(
        (suma, e) => suma + (Date.now() - new Date(e.fecha_creacion).getTime()),
        0
      ) / conFecha.length / MILIS_POR_ANIO
    : 0;

  return {
    total: empleados.length,
    activos: porEstado["Activo"] ?? 0,
    vacaciones: porEstado["Vacaciones"] ?? 0,
    enfermos: porEstado["Enfermo"] ?? 0,
    inactivos: porEstado["Inactivo"] ?? 0,
    antiguedad,
  };
};

/*
  Presentismo: turnos a los que asistió sobre los turnos que había que
  cumplir. "Sin salida" cuenta como asistencia (llegó; lo que falta es la
  marca, y por eso no suma horas). Las licencias (vacaciones, enfermedad)
  no cuentan en contra: son ausencias justificadas.
*/
const presentismo = (f) => {
  const exigibles = Number(f.turnos) - Number(f.licencias);
  const asistidos = Number(f.presentes) + Number(f.sin_salida);
  return exigibles > 0 ? `${Math.round((asistidos / exigibles) * 100)}%` : "—";
};

/* Cantidad de turnos por estado de asistencia, para el resumen del historial */
const contarPorEstado = (filas) => {
  const conteo = {};
  filas.forEach((f) => {
    const clave = f.estado_asistencia ?? "SIN_CONTROL";
    conteo[clave] = (conteo[clave] ?? 0) + 1;
  });
  return conteo;
};

// Los reportes salen del historial, que se congela con un día de gracia.
const AVISO_HISTORIAL =
  "Incluye los turnos ya cerrados en el historial. Los de ayer y hoy todavía no aparecen: " +
  "RRHH puede corregir sus marcas hasta el día siguiente al turno.";

/*
  Fuera del componente a propósito: definida adentro, React la tomaría como
  un tipo nuevo en cada render (regla react-hooks/static-components).
*/
function TarjetaResumen({ titulo, valor, icono, color }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className={`inline-flex rounded-lg p-2 ${color}`}>{icono}</div>
        <p className="mt-2 text-2xl font-bold leading-none">{valor}</p>
        <p className="mt-1 text-sm text-gray-500">{titulo}</p>
      </CardContent>
    </Card>
  );
}

export default function Reportes() {
  const { tienePermiso } = useAuth();

  const [reporte, setReporte] = useState("historial");
  const [filas, setFilas] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [puestos, setPuestos] = useState([]);
  // null hasta que cargue el listado: si falla, las tarjetas no se muestran
  const [resumen, setResumen] = useState(null);

  // Filtros (historial y horas comparten el rango de fechas)
  const [desde, setDesde] = useState(hace30());
  const [hasta, setHasta] = useState(hoyISO());
  const [empleado, setEmpleado] = useState("");
  const [puesto, setPuesto] = useState("todos");
  const [asistencia, setAsistencia] = useState("todas");

  const cargar = async () => {
    setCargando(true);
    try {
      if (reporte === "historial") {
        setFilas(
          await getReporteHistorial({
            desde,
            hasta,
            empleado: empleado.trim() || undefined,
            puesto: puesto !== "todos" ? puesto : undefined,
            asistencia: asistencia !== "todas" ? asistencia : undefined,
          })
        );
      } else if (reporte === "horas") {
        setFilas(await getReporteHoras({ desde, hasta }));
      } else {
        setFilas(await getReporteDotacion());
      }
    } catch (error) {
      toast.error(error.response?.data?.error || "No se pudo cargar el reporte");
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    getCatalogos()
      .then((c) => setPuestos(c.puestos))
      .catch(() => {});

    // Estados y antigüedad del resumen de dotación: se calculan sobre el
    // listado, con el mismo criterio que los indicadores del dashboard.
    // Quien tiene REPORTES_VER (admin y RRHH) también tiene EMPLEADOS_VER.
    getEmpleadosDetalle()
      .then((lista) => setResumen(calcularResumen(lista)))
      .catch(() => {});
  }, []);

  useEffect(() => {
    // El efecto no puede ser async: la IIFE deja las actualizaciones de
    // estado fuera de su cuerpo síncrono (react-hooks/set-state-in-effect).
    (async () => { await cargar(); })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reporte]);

  if (!tienePermiso("REPORTES_VER")) {
    return <Navigate to="/" replace />;
  }

  const exportar = () => {
    const fechaHoy = hoyISO();
    if (reporte === "historial") {
      descargarCSV(
        filas.map((f) => ({
          ...f,
          fecha: formatearFecha(f.fecha),
          hora_ingreso: horaCorta(f.hora_ingreso),
          hora_egreso: horaCorta(f.hora_egreso),
          estado_asistencia: (ESTADOS_ASISTENCIA[f.estado_asistencia] ?? SIN_CONTROL).etiqueta,
        })),
        [
          { clave: "fecha", titulo: "Fecha" },
          { clave: "estado_asistencia", titulo: "Asistencia" },
          { clave: "empleado_nombre", titulo: "Nombre" },
          { clave: "empleado_apellido", titulo: "Apellido" },
          { clave: "puesto", titulo: "Puesto" },
          { clave: "lugar_trabajo", titulo: "Lugar" },
          { clave: "hora_inicio", titulo: "Hora inicio" },
          { clave: "hora_fin", titulo: "Hora fin" },
          { clave: "hora_ingreso", titulo: "Ingreso" },
          { clave: "hora_egreso", titulo: "Salida" },
          { clave: "horas_trabajadas", titulo: "Horas trabajadas" },
        ],
        `historial_turnos_${fechaHoy}.csv`
      );
    } else if (reporte === "horas") {
      descargarCSV(
        filas.map((f) => ({ ...f, presentismo: presentismo(f) })),
        [
          { clave: "empleado_nombre", titulo: "Nombre" },
          { clave: "empleado_apellido", titulo: "Apellido" },
          { clave: "puesto", titulo: "Puesto" },
          { clave: "turnos", titulo: "Turnos" },
          { clave: "presentes", titulo: "Asistió" },
          { clave: "sin_salida", titulo: "Sin salida" },
          { clave: "ausencias", titulo: "No asistió" },
          { clave: "licencias", titulo: "Licencias" },
          { clave: "horas_programadas", titulo: "Horas programadas" },
          { clave: "horas_trabajadas", titulo: "Horas trabajadas" },
          { clave: "presentismo", titulo: "Presentismo" },
        ],
        `horas_trabajadas_${desde}_a_${hasta}.csv`
      );
    } else {
      descargarCSV(
        filas,
        [
          { clave: "puesto", titulo: "Puesto" },
          { clave: "lugar_trabajo", titulo: "Lugar" },
          { clave: "cantidad_empleados", titulo: "Cantidad" },
        ],
        `dotacion_${fechaHoy}.csv`
      );
    }
  };

  const conteo = reporte === "historial" ? contarPorEstado(filas) : {};

  const totalEmpleados = filas.reduce(
    (suma, f) => suma + Number(f.cantidad_empleados ?? 0),
    0
  );

  return (
    <Layout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">Reportes</h2>
          <Button onClick={exportar} disabled={filas.length === 0}>
            <Download className="h-4 w-4" />
            Descargar CSV
          </Button>
        </div>

        {/* Selector de reporte */}
        <div className="flex gap-1 border-b border-gray-200">
          {REPORTES.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => {
                // Sin esto, las filas del reporte anterior se dibujan un
                // instante con las columnas del nuevo.
                if (r.id !== reporte) setFilas([]);
                setReporte(r.id);
              }}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                reporte === r.id
                  ? "border-emerald-600 text-emerald-700"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {r.nombre}
            </button>
          ))}
        </div>

        {/* Filtros */}
        {reporte !== "dotacion" && (
          <Card>
            <CardContent className="p-4 flex flex-wrap items-end gap-4">
              <div className="space-y-1">
                <Label htmlFor="desde">Desde</Label>
                <Input
                  id="desde"
                  type="date"
                  value={desde}
                  onChange={(e) => setDesde(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="hasta">Hasta</Label>
                <Input
                  id="hasta"
                  type="date"
                  value={hasta}
                  onChange={(e) => setHasta(e.target.value)}
                />
              </div>
              {reporte === "historial" && (
                <>
                  <div className="space-y-1">
                    <Label htmlFor="filtro-empleado">Empleado</Label>
                    <Input
                      id="filtro-empleado"
                      placeholder="Nombre o apellido"
                      value={empleado}
                      onChange={(e) => setEmpleado(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Puesto</Label>
                    <Select value={puesto} onValueChange={setPuesto}>
                      <SelectTrigger className="w-44">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todos los puestos</SelectItem>
                        {puestos.map((p) => (
                          <SelectItem key={p.id} value={p.nombre}>
                            {p.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Asistencia</Label>
                    <Select value={asistencia} onValueChange={setAsistencia}>
                      <SelectTrigger className="w-40" aria-label="Filtrar por asistencia">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todas">Todas</SelectItem>
                        {ESTADOS_HISTORIAL.map((estado) => (
                          <SelectItem key={estado} value={estado}>
                            <PuntoAsistencia estado={estado} />
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
              <Button onClick={cargar} disabled={cargando}>
                {cargando ? "Buscando..." : "Buscar"}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Resumen de dotación: totales por estado y antigüedad promedio */}
        {reporte === "dotacion" && resumen && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <TarjetaResumen
              titulo="Total de empleados"
              valor={resumen.total}
              icono={<Users className="h-5 w-5" />}
              color="bg-emerald-100 text-emerald-700"
            />
            <TarjetaResumen
              titulo="Activos"
              valor={resumen.activos}
              icono={<UserCheck className="h-5 w-5" />}
              color="bg-green-100 text-green-700"
            />
            <TarjetaResumen
              titulo="En vacaciones"
              valor={resumen.vacaciones}
              icono={<Plane className="h-5 w-5" />}
              color="bg-blue-100 text-blue-700"
            />
            <TarjetaResumen
              titulo="Enfermos"
              valor={resumen.enfermos}
              icono={<Thermometer className="h-5 w-5" />}
              color="bg-yellow-100 text-yellow-700"
            />
            <TarjetaResumen
              titulo="Inactivos"
              valor={resumen.inactivos}
              icono={<UserX className="h-5 w-5" />}
              color="bg-red-100 text-red-700"
            />
            <TarjetaResumen
              titulo="Antigüedad promedio"
              valor={`${resumen.antiguedad.toFixed(1)} años`}
              icono={<Clock className="h-5 w-5" />}
              color="bg-purple-100 text-purple-700"
            />
          </div>
        )}

        {reporte !== "dotacion" && (
          <p className="text-xs text-gray-500">{AVISO_HISTORIAL}</p>
        )}

        {/* Historial: cuántos turnos asistió y cuántos no, con los mismos puntos de la tabla */}
        {reporte === "historial" && !cargando && filas.length > 0 && (
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-gray-600">
            <span className="font-semibold text-gray-800">{filas.length} turnos</span>
            {[...ESTADOS_HISTORIAL, "SIN_CONTROL"]
              .filter((estado) => conteo[estado])
              .map((estado) => (
                <PuntoAsistencia key={estado} estado={estado} cantidad={conteo[estado]} />
              ))}
          </div>
        )}

        {/* Resultados */}
        <div className="bg-white rounded-lg border">
          {cargando ? (
            <p className="p-6 text-gray-500">Cargando reporte...</p>
          ) : filas.length === 0 ? (
            <p className="p-6 text-gray-400">
              Sin resultados para los filtros seleccionados.
            </p>
          ) : reporte === "historial" ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Asistencia</TableHead>
                  <TableHead>Empleado</TableHead>
                  <TableHead>Puesto</TableHead>
                  <TableHead>Lugar</TableHead>
                  <TableHead>Horario</TableHead>
                  <TableHead>Ingreso</TableHead>
                  <TableHead>Salida</TableHead>
                  <TableHead className="text-right">Horas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filas.map((f, i) => (
                  <TableRow
                    key={i}
                    className={f.estado_asistencia === "AUSENTE" ? "bg-red-50/60" : undefined}
                  >
                    <TableCell className="whitespace-nowrap">{formatearFecha(f.fecha)}</TableCell>
                    <TableCell>
                      {/* NULL: turno archivado antes de que existiera el control de asistencia */}
                      <PuntoAsistencia estado={f.estado_asistencia} />
                    </TableCell>
                    <TableCell className="font-medium">
                      {f.empleado_nombre} {f.empleado_apellido}
                    </TableCell>
                    <TableCell>{f.puesto}</TableCell>
                    <TableCell>{f.lugar_trabajo}</TableCell>
                    <TableCell>
                      {horaCorta(f.hora_inicio)}–{horaCorta(f.hora_fin)}
                    </TableCell>
                    <TableCell>{horaCorta(f.hora_ingreso) || "—"}</TableCell>
                    <TableCell>{horaCorta(f.hora_egreso) || "—"}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {f.horas_trabajadas ?? "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : reporte === "horas" ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Empleado</TableHead>
                  <TableHead>Puesto</TableHead>
                  <TableHead className="text-right">Turnos</TableHead>
                  <TableHead className="text-right">Asistió</TableHead>
                  <TableHead className="text-right">Sin salida</TableHead>
                  <TableHead className="text-right">No asistió</TableHead>
                  <TableHead className="text-right">Licencias</TableHead>
                  <TableHead className="text-right">Hs. programadas</TableHead>
                  <TableHead className="text-right">Hs. trabajadas</TableHead>
                  <TableHead className="text-right">Presentismo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filas.map((f, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">
                      {f.empleado_nombre} {f.empleado_apellido}
                    </TableCell>
                    <TableCell>{f.puesto}</TableCell>
                    <TableCell className="text-right tabular-nums">{f.turnos}</TableCell>
                    <TableCell className="text-right tabular-nums">{f.presentes}</TableCell>
                    <TableCell
                      className={`text-right tabular-nums ${
                        Number(f.sin_salida) > 0 ? "font-semibold text-amber-700" : ""
                      }`}
                    >
                      {f.sin_salida}
                    </TableCell>
                    <TableCell
                      className={`text-right tabular-nums ${
                        Number(f.ausencias) > 0 ? "font-semibold text-red-700" : ""
                      }`}
                    >
                      {f.ausencias}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{f.licencias}</TableCell>
                    <TableCell className="text-right tabular-nums text-gray-500">
                      {f.horas_programadas}
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-semibold">
                      {f.horas_trabajadas}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{presentismo(f)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Puesto</TableHead>
                  <TableHead>Lugar</TableHead>
                  <TableHead className="text-right">Empleados</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filas.map((f, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{f.puesto}</TableCell>
                    <TableCell>{f.lugar_trabajo}</TableCell>
                    <TableCell className="text-right">{f.cantidad_empleados}</TableCell>
                  </TableRow>
                ))}
                <TableRow>
                  <TableCell className="font-bold" colSpan={2}>
                    Total
                  </TableCell>
                  <TableCell className="text-right font-bold">
                    {totalEmpleados}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </Layout>
  );
}
