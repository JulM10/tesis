import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getDotacionPeriodo } from "@/services/reportes.services";
import {
  hoyISO,
  lunesDeSemana,
  sumarDias,
  inicioDeMes,
  finDeMes,
  sumarMeses,
  formatearFecha,
} from "@/lib/fechas";
import { COLOR_NEUTRO } from "@/lib/colores";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/*
  Dotación por puesto en un período: cuántos empleados distintos tienen
  turnos de cada puesto en la semana o el mes. Sale de los turnos
  planificados, así que incluye los días que todavía no pasaron.
  Cada barra usa el color del puesto (el mismo del calendario).
*/

const PERIODOS = [
  { id: "semana", nombre: "Semana" },
  { id: "mes", nombre: "Mes" },
];

const NOMBRE_MES = new Intl.DateTimeFormat("es-AR", { month: "long", year: "numeric" });

const rangoDe = (periodo, referencia) => {
  if (periodo === "semana") {
    const lunes = lunesDeSemana(referencia);
    return { desde: lunes, hasta: sumarDias(lunes, 6) };
  }
  return { desde: inicioDeMes(referencia), hasta: finDeMes(referencia) };
};

const describirRango = (periodo, { desde, hasta }) => {
  if (periodo === "semana") {
    return `Semana del ${formatearFecha(desde).slice(0, 5)} al ${formatearFecha(hasta)}`;
  }
  const [anio, mes] = desde.split("-").map(Number);
  const nombre = NOMBRE_MES.format(new Date(anio, mes - 1, 1));
  return nombre.charAt(0).toUpperCase() + nombre.slice(1);
};

// Fuera del componente: definido adentro sería un tipo nuevo en cada render.
function DetallePuesto({ active, payload }) {
  if (!active || !payload?.length) return null;
  const fila = payload[0].payload;

  return (
    <div className="rounded-md border border-gray-200 bg-white px-3 py-2 text-xs shadow-md">
      <p className="font-semibold text-gray-900">{fila.puesto}</p>
      <p className="text-gray-700">
        {fila.empleados} empleado{fila.empleados === 1 ? "" : "s"} distinto
        {fila.empleados === 1 ? "" : "s"}
      </p>
      <p className="text-gray-500">
        {fila.asignaciones} asignaci{fila.asignaciones === 1 ? "ón" : "ones"} en {fila.turnos}{" "}
        turno{fila.turnos === 1 ? "" : "s"}
      </p>
    </div>
  );
}

export default function GraficoDotacion() {
  const [periodo, setPeriodo] = useState("semana");
  const [referencia, setReferencia] = useState(hoyISO);
  // Resultado etiquetado con su rango: si no coincide con el pedido
  // actual, está cargando (así el efecto no hace setState sincrónico).
  const [resultado, setResultado] = useState(null);

  const { desde, hasta } = rangoDe(periodo, referencia);
  const clave = `${desde}|${hasta}`;
  const cargando = resultado?.clave !== clave;
  const filas = resultado?.filas ?? [];

  useEffect(() => {
    let cancelado = false;

    (async () => {
      try {
        const datos = await getDotacionPeriodo({ desde, hasta });
        if (!cancelado) setResultado({ clave: `${desde}|${hasta}`, filas: datos, error: "" });
      } catch (error) {
        if (!cancelado) {
          setResultado({
            clave: `${desde}|${hasta}`,
            filas: [],
            error: error.response?.data?.error || "No se pudo cargar la dotación",
          });
        }
      }
    })();

    return () => {
      cancelado = true;
    };
  }, [desde, hasta]);

  const mover = (sentido) =>
    setReferencia(
      periodo === "semana"
        ? sumarDias(referencia, 7 * sentido)
        : sumarMeses(inicioDeMes(referencia), sentido)
    );

  const totalAsignaciones = filas.reduce((suma, f) => suma + f.asignaciones, 0);
  const sinTurnos = !cargando && filas.every((f) => f.turnos === 0);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">Dotación por puesto</CardTitle>
            <p className="mt-1 text-sm text-gray-500">
              Empleados distintos con turnos asignados en el período, según el puesto del
              turno.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-md border border-gray-200 p-0.5" role="group" aria-label="Período">
              {PERIODOS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPeriodo(p.id)}
                  aria-pressed={periodo === p.id}
                  className={`rounded px-3 py-1 text-sm font-medium transition-colors ${
                    periodo === p.id
                      ? "bg-emerald-600 text-white"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  {p.nombre}
                </button>
              ))}
            </div>
            <Button variant="outline" size="sm" onClick={() => mover(-1)} aria-label="Período anterior">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setReferencia(hoyISO())}>
              Actual
            </Button>
            <Button variant="outline" size="sm" onClick={() => mover(1)} aria-label="Período siguiente">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <p className="text-sm font-medium text-gray-700">
          {describirRango(periodo, { desde, hasta })}
          {!cargando && !sinTurnos && (
            <span className="font-normal text-gray-500">
              {" "}· {totalAsignaciones} asignaciones de turno
            </span>
          )}
        </p>
      </CardHeader>

      <CardContent>
        {resultado?.error && !cargando ? (
          <p className="py-10 text-center text-sm text-red-700">{resultado.error}</p>
        ) : sinTurnos ? (
          <p className="py-10 text-center text-sm text-gray-400">
            No hay turnos planificados en este período.
          </p>
        ) : (
          <div className={`h-72 transition-opacity ${cargando ? "opacity-40" : ""}`}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={filas} margin={{ top: 24, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis
                  dataKey="puesto"
                  tickLine={false}
                  axisLine={false}
                  interval={0}
                  tick={{ fontSize: 12, fill: "#4b5563" }}
                />
                <YAxis
                  allowDecimals={false}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 12, fill: "#6b7280" }}
                />
                <Tooltip content={<DetallePuesto />} cursor={{ fill: "#f3f4f6" }} />
                <Bar dataKey="empleados" radius={[4, 4, 0, 0]} maxBarSize={64}>
                  {filas.map((f) => (
                    <Cell key={f.puesto} fill={f.color ?? COLOR_NEUTRO} />
                  ))}
                  <LabelList dataKey="empleados" position="top" fontSize={12} fill="#374151" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Mismos datos en texto, para lectores de pantalla */}
        <ul className="sr-only">
          {filas.map((f) => (
            <li key={f.puesto}>
              {f.puesto}: {f.empleados} empleados, {f.turnos} turnos
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
