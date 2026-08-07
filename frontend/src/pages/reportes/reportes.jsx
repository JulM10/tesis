import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { toast } from "sonner";
import { Download } from "lucide-react";
import Layout from "@/components/Layout";
import { useAuth } from "@/context/AuthContext";
import {
  getReporteHistorial,
  getReporteHoras,
  getReporteDotacion,
  descargarCSV,
} from "@/services/reportes.services";
import { getCatalogos } from "@/services/empleados.services";
import { hoyISO, formatearFecha, horaCorta } from "@/lib/fechas";

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

export default function Reportes() {
  const { tienePermiso } = useAuth();

  const [reporte, setReporte] = useState("historial");
  const [filas, setFilas] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [puestos, setPuestos] = useState([]);

  // Filtros (historial y horas comparten el rango de fechas)
  const [desde, setDesde] = useState(hace30());
  const [hasta, setHasta] = useState(hoyISO());
  const [empleado, setEmpleado] = useState("");
  const [puesto, setPuesto] = useState("todos");

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
        filas.map((f) => ({ ...f, fecha: formatearFecha(f.fecha) })),
        [
          { clave: "empleado_nombre", titulo: "Nombre" },
          { clave: "empleado_apellido", titulo: "Apellido" },
          { clave: "puesto", titulo: "Puesto" },
          { clave: "lugar_trabajo", titulo: "Lugar" },
          { clave: "fecha", titulo: "Fecha" },
          { clave: "hora_inicio", titulo: "Hora inicio" },
          { clave: "hora_fin", titulo: "Hora fin" },
        ],
        `historial_turnos_${fechaHoy}.csv`
      );
    } else if (reporte === "horas") {
      descargarCSV(
        filas,
        [
          { clave: "empleado_nombre", titulo: "Nombre" },
          { clave: "empleado_apellido", titulo: "Apellido" },
          { clave: "puesto", titulo: "Puesto" },
          { clave: "turnos", titulo: "Turnos" },
          { clave: "horas", titulo: "Horas" },
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
              onClick={() => setReporte(r.id)}
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
                </>
              )}
              <Button onClick={cargar} disabled={cargando}>
                {cargando ? "Buscando..." : "Buscar"}
              </Button>
            </CardContent>
          </Card>
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
                  <TableHead>Empleado</TableHead>
                  <TableHead>Puesto</TableHead>
                  <TableHead>Lugar</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Horario</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filas.map((f, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">
                      {f.empleado_nombre} {f.empleado_apellido}
                    </TableCell>
                    <TableCell>{f.puesto}</TableCell>
                    <TableCell>{f.lugar_trabajo}</TableCell>
                    <TableCell>{formatearFecha(f.fecha)}</TableCell>
                    <TableCell>
                      {horaCorta(f.hora_inicio)}–{horaCorta(f.hora_fin)}
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
                  <TableHead className="text-right">Horas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filas.map((f, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">
                      {f.empleado_nombre} {f.empleado_apellido}
                    </TableCell>
                    <TableCell>{f.puesto}</TableCell>
                    <TableCell className="text-right">{f.turnos}</TableCell>
                    <TableCell className="text-right font-semibold">
                      {f.horas}
                    </TableCell>
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
