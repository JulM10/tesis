import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getLicencias,
  crearLicencia,
  eliminarLicencia,
} from "@/services/empleados.services";
import { getMisLicencias } from "@/services/me.services";
import { formatearFecha } from "@/lib/fechas";

const TIPOS_LICENCIA = {
  VACACIONES: { etiqueta: "Vacaciones", color: "bg-blue-100 text-blue-800" },
  ENFERMEDAD: { etiqueta: "Enfermedad", color: "bg-yellow-100 text-yellow-800" },
  ESPECIAL: { etiqueta: "Especial", color: "bg-purple-100 text-purple-800" },
};

const NUEVA_VACIA = { tipo: "VACACIONES", fecha_desde: "", fecha_hasta: "", comentario: "" };

const MS_POR_DIA = 24 * 60 * 60 * 1000;

// Días corridos, como los cuenta el backend. null si el rango no es válido.
const diasDelRango = (desde, hasta) => {
  if (!desde || !hasta || hasta < desde) return null;
  return (Date.parse(hasta) - Date.parse(desde)) / MS_POR_DIA + 1;
};

// Enter dentro del modal enviaría el formulario del empleado que lo contiene.
const evitarEnvio = (e) => {
  if (e.key === "Enter") e.preventDefault();
};

/*
  Licencias de un empleado y saldo de vacaciones del año.
  - Con idEmpleado: vista de RRHH, con alta y baja (modal de empleados).
  - Sin idEmpleado: las licencias propias, solo lectura (Mi Perfil).
*/
export default function LicenciasEmpleado({ idEmpleado = null, onCambio }) {
  const editable = idEmpleado !== null;

  const [datos, setDatos] = useState(null);
  const [nueva, setNueva] = useState(NUEVA_VACIA);
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async () => {
    try {
      setDatos(editable ? await getLicencias(idEmpleado) : await getMisLicencias());
    } catch (error) {
      toast.error(error.response?.data?.error || "No se pudieron cargar las licencias");
    }
  }, [editable, idEmpleado]);

  useEffect(() => {
    (async () => { await cargar(); })();
  }, [cargar]);

  const dias = diasDelRango(nueva.fecha_desde, nueva.fecha_hasta);

  const agregar = async () => {
    setGuardando(true);
    try {
      await crearLicencia(idEmpleado, {
        ...nueva,
        comentario: nueva.comentario.trim() || null,
      });
      toast.success("Licencia registrada");
      setNueva(NUEVA_VACIA);
      await cargar();
      onCambio?.();
    } catch (error) {
      toast.error(error.response?.data?.error || "No se pudo registrar la licencia");
    } finally {
      setGuardando(false);
    }
  };

  const quitar = async (idLicencia) => {
    try {
      await eliminarLicencia(idEmpleado, idLicencia);
      toast.success("Licencia eliminada");
      await cargar();
      onCambio?.();
    } catch (error) {
      toast.error(error.response?.data?.error || "No se pudo eliminar la licencia");
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Label>Licencias</Label>
        {datos && (
          <span className="text-xs text-gray-500">
            Vacaciones {datos.anio}:{" "}
            <strong className="text-gray-800">{datos.disponibles}</strong> de{" "}
            {datos.dias_anuales} días disponibles
          </span>
        )}
      </div>

      {!datos ? (
        <p className="text-xs text-gray-400">Cargando licencias...</p>
      ) : datos.licencias.length === 0 ? (
        <p className="text-xs text-gray-400">Sin licencias registradas.</p>
      ) : (
        <ul className="max-h-44 space-y-1.5 overflow-y-auto">
          {datos.licencias.map((licencia) => {
            const tipo = TIPOS_LICENCIA[licencia.tipo];
            return (
              <li
                key={licencia.id}
                className="flex items-start gap-2 rounded-md bg-gray-50 px-2 py-1.5 text-sm"
              >
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${tipo.color}`}>
                  {tipo.etiqueta}
                </span>
                <div className="min-w-0 flex-1">
                  <p>
                    {formatearFecha(licencia.fecha_desde)} al {formatearFecha(licencia.fecha_hasta)}
                    {" · "}
                    {licencia.dias} día{licencia.dias === 1 ? "" : "s"}
                  </p>
                  {licencia.comentario && (
                    <p className="break-words text-xs text-gray-500">{licencia.comentario}</p>
                  )}
                </div>
                {editable && (
                  <Button type="button" variant="outline" size="sm" onClick={() => quitar(licencia.id)}>
                    Quitar
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {editable && (
        <div className="grid grid-cols-2 gap-2 rounded-md border border-dashed p-2">
          <Select value={nueva.tipo} onValueChange={(v) => setNueva({ ...nueva, tipo: v })}>
            <SelectTrigger aria-label="Tipo de licencia">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(TIPOS_LICENCIA).map(([valor, { etiqueta }]) => (
                <SelectItem key={valor} value={valor}>{etiqueta}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="self-center text-xs text-gray-500">
            {dias
              ? `${dias} día${dias === 1 ? "" : "s"} corrido${dias === 1 ? "" : "s"}`
              : "Elegí el rango de fechas"}
          </p>

          <div className="space-y-1">
            <Label htmlFor="licencia-desde" className="text-xs">Desde</Label>
            <Input
              id="licencia-desde"
              type="date"
              value={nueva.fecha_desde}
              onChange={(e) => setNueva({ ...nueva, fecha_desde: e.target.value })}
              onKeyDown={evitarEnvio}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="licencia-hasta" className="text-xs">Hasta</Label>
            <Input
              id="licencia-hasta"
              type="date"
              min={nueva.fecha_desde || undefined}
              value={nueva.fecha_hasta}
              onChange={(e) => setNueva({ ...nueva, fecha_hasta: e.target.value })}
              onKeyDown={evitarEnvio}
            />
          </div>

          <Input
            className="col-span-2"
            placeholder="Comentario (opcional): certificado, motivo..."
            maxLength={500}
            value={nueva.comentario}
            onChange={(e) => setNueva({ ...nueva, comentario: e.target.value })}
            onKeyDown={evitarEnvio}
          />

          <Button
            type="button"
            size="sm"
            className="col-span-2"
            disabled={!dias || guardando}
            onClick={agregar}
          >
            {guardando ? "Guardando..." : "Agregar licencia"}
          </Button>
        </div>
      )}
    </div>
  );
}
