import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import Layout from "@/components/Layout";
import { useAuth } from "@/context/AuthContext";
import {
  getCalendario,
  createCalendario,
  deleteCalendario,
} from "@/services/calendario.services";
import {
  getAllHorarios,
  asignarEmpleadoATurno,
  eliminarAsignacion,
} from "@/services/horarios.services";
import { getCatalogos, getEmpleadosDetalle } from "@/services/empleados.services";
import {
  hoyISO,
  lunesDeSemana,
  sumarDias,
  soloFecha,
  formatearFecha,
  horaCorta,
  NOMBRES_DIAS,
} from "@/lib/fechas";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const FORM_TURNO_VACIO = { fecha: "", hora_inicio: "", hora_fin: "", id_puesto: "" };

export default function Calendario() {
  const { tienePermiso } = useAuth();

  const [lunes, setLunes] = useState(lunesDeSemana(hoyISO()));
  const [turnos, setTurnos] = useState([]);
  const [asignaciones, setAsignaciones] = useState([]);
  const [catalogos, setCatalogos] = useState({ puestos: [], lugares: [], estados: [] });
  const [empleados, setEmpleados] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [filtroPuesto, setFiltroPuesto] = useState("todos");
  const [filtroEmpleado, setFiltroEmpleado] = useState("todos");

  // Dialogs
  const [formTurno, setFormTurno] = useState(FORM_TURNO_VACIO);
  const [dialogTurnoAbierto, setDialogTurnoAbierto] = useState(false);
  const [turnoAAsignar, setTurnoAAsignar] = useState(null);
  const [empleadoAAsignar, setEmpleadoAAsignar] = useState("");
  const [turnoABorrar, setTurnoABorrar] = useState(null);
  const [guardando, setGuardando] = useState(false);

  const cargarDatos = async () => {
    try {
      const [listaTurnos, listaAsignaciones, listaCatalogos, listaEmpleados] =
        await Promise.all([
          getCalendario(),
          getAllHorarios(),
          getCatalogos(),
          getEmpleadosDetalle(),
        ]);
      setTurnos(listaTurnos);
      setAsignaciones(listaAsignaciones);
      setCatalogos(listaCatalogos);
      setEmpleados(listaEmpleados);
    } catch (error) {
      toast.error(error.response?.data?.error || "No se pudo cargar el calendario");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const dias = useMemo(
    () => Array.from({ length: 7 }, (_, i) => sumarDias(lunes, i)),
    [lunes]
  );

  const nombrePuesto = useMemo(() => {
    const mapa = {};
    catalogos.puestos.forEach((p) => (mapa[p.id] = p.nombre));
    return mapa;
  }, [catalogos]);

  // Asignaciones agrupadas por turno
  const asignadosPorTurno = useMemo(() => {
    const mapa = {};
    asignaciones.forEach((a) => {
      (mapa[a.calendario_id] ??= []).push(a);
    });
    return mapa;
  }, [asignaciones]);

  // Turnos visibles según filtros, agrupados por día
  const turnosPorDia = useMemo(() => {
    const mapa = {};
    turnos
      .filter((t) => {
        if (filtroPuesto !== "todos" && t.id_puesto !== Number(filtroPuesto)) {
          return false;
        }
        if (filtroEmpleado !== "todos") {
          const asignados = asignadosPorTurno[t.id] ?? [];
          if (!asignados.some((a) => a.empleado_id === Number(filtroEmpleado))) {
            return false;
          }
        }
        return true;
      })
      .forEach((t) => {
        (mapa[soloFecha(t.fecha)] ??= []).push(t);
      });
    Object.values(mapa).forEach((lista) =>
      lista.sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio))
    );
    return mapa;
  }, [turnos, filtroPuesto, filtroEmpleado, asignadosPorTurno]);

  const abrirNuevoTurno = (fecha) => {
    setFormTurno({ ...FORM_TURNO_VACIO, fecha: fecha ?? hoyISO() });
    setDialogTurnoAbierto(true);
  };

  const guardarTurno = async (e) => {
    e.preventDefault();
    setGuardando(true);
    try {
      await createCalendario({
        fecha: formTurno.fecha,
        hora_inicio: formTurno.hora_inicio,
        hora_fin: formTurno.hora_fin,
        id_puesto: formTurno.id_puesto ? Number(formTurno.id_puesto) : null,
      });
      toast.success("Turno creado correctamente");
      setDialogTurnoAbierto(false);
      await cargarDatos();
    } catch (error) {
      toast.error(error.response?.data?.error || "No se pudo crear el turno");
    } finally {
      setGuardando(false);
    }
  };

  const asignar = async () => {
    if (!empleadoAAsignar) {
      toast.error("Seleccioná un empleado");
      return;
    }
    setGuardando(true);
    try {
      await asignarEmpleadoATurno({
        id_empleado: Number(empleadoAAsignar),
        id_calendario: turnoAAsignar.id,
      });
      toast.success("Empleado asignado al turno");
      setTurnoAAsignar(null);
      setEmpleadoAAsignar("");
      await cargarDatos();
    } catch (error) {
      // 409: turno duplicado o solapamiento de horarios
      toast.error(error.response?.data?.error || "No se pudo asignar el turno");
    } finally {
      setGuardando(false);
    }
  };

  const quitarAsignacion = async (asignado, idCalendario) => {
    try {
      await eliminarAsignacion(asignado.empleado_id, idCalendario);
      toast.success("Asignación eliminada");
      await cargarDatos();
    } catch (error) {
      toast.error(error.response?.data?.error || "No se pudo quitar la asignación");
    }
  };

  const confirmarBorradoTurno = async () => {
    try {
      await deleteCalendario(turnoABorrar.id);
      toast.success("Turno eliminado correctamente");
      setTurnoABorrar(null);
      await cargarDatos();
    } catch (error) {
      toast.error(error.response?.data?.error || "No se pudo eliminar el turno");
    }
  };

  const puedeGestionar = tienePermiso("CALENDARIO_CREAR");
  const puedeEliminar = tienePermiso("CALENDARIO_ELIMINAR");

  return (
    <Layout>
      <div className="space-y-4">
        {/* Encabezado y controles */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-bold">Calendario de Turnos</h2>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setLunes(sumarDias(lunes, -7))}>
              ← Semana anterior
            </Button>
            <Button variant="outline" size="sm" onClick={() => setLunes(lunesDeSemana(hoyISO()))}>
              Hoy
            </Button>
            <Button variant="outline" size="sm" onClick={() => setLunes(sumarDias(lunes, 7))}>
              Semana siguiente →
            </Button>
            {puedeGestionar && (
              <Button size="sm" onClick={() => abrirNuevoTurno()}>
                Nuevo turno
              </Button>
            )}
          </div>
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm text-gray-500">
            Semana del {formatearFecha(lunes)} al {formatearFecha(sumarDias(lunes, 6))}
          </span>
          <div className="flex items-center gap-2 ml-auto">
            <Select value={filtroPuesto} onValueChange={setFiltroPuesto}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Puesto" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los puestos</SelectItem>
                {catalogos.puestos.map((p) => (
                  <SelectItem key={p.id} value={String(p.id)}>{p.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filtroEmpleado} onValueChange={setFiltroEmpleado}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Empleado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los empleados</SelectItem>
                {empleados.map((emp) => (
                  <SelectItem key={emp.empleado_id} value={String(emp.empleado_id)}>
                    {emp.nombre} {emp.apellido}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Grilla semanal */}
        {loading ? (
          <p className="text-gray-500">Cargando calendario...</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-2">
            {dias.map((fecha, i) => {
              const esHoy = fecha === hoyISO();
              const turnosDelDia = turnosPorDia[fecha] ?? [];
              return (
                <div
                  key={fecha}
                  className={`bg-white rounded-lg border p-2 min-h-40 flex flex-col gap-2 ${
                    esHoy ? "border-emerald-400 ring-1 ring-emerald-200" : "border-gray-200"
                  }`}
                >
                  <div className="text-center">
                    <p className="text-xs text-gray-500">{NOMBRES_DIAS[i]}</p>
                    <p className={`text-sm font-semibold ${esHoy ? "text-emerald-700" : ""}`}>
                      {formatearFecha(fecha).slice(0, 5)}
                    </p>
                  </div>

                  {turnosDelDia.map((turno) => {
                    const asignados = asignadosPorTurno[turno.id] ?? [];
                    return (
                      <div
                        key={turno.id}
                        className="rounded-md border border-emerald-200 bg-emerald-50 p-2 text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-semibold text-emerald-800">
                            {horaCorta(turno.hora_inicio)}–{horaCorta(turno.hora_fin)}
                          </span>
                          {puedeEliminar && (
                            <button
                              type="button"
                              title="Eliminar turno"
                              className="text-red-400 hover:text-red-600 font-bold"
                              onClick={() => setTurnoABorrar(turno)}
                            >
                              ✕
                            </button>
                          )}
                        </div>
                        {turno.id_puesto && (
                          <p className="text-emerald-700">{nombrePuesto[turno.id_puesto]}</p>
                        )}

                        <div className="space-y-1">
                          {asignados.map((a) => (
                            <div
                              key={a.empleado_id}
                              className="flex items-center justify-between bg-white rounded px-1.5 py-0.5 border border-emerald-100"
                            >
                              <span>{a.empleado_nombre} {a.empleado_apellido}</span>
                              {puedeEliminar && (
                                <button
                                  type="button"
                                  title="Quitar asignación"
                                  className="text-gray-400 hover:text-red-600 ml-1"
                                  onClick={() => quitarAsignacion(a, turno.id)}
                                >
                                  ✕
                                </button>
                              )}
                            </div>
                          ))}
                          {asignados.length === 0 && (
                            <p className="text-gray-400 italic">Sin asignar</p>
                          )}
                        </div>

                        {puedeGestionar && (
                          <button
                            type="button"
                            className="w-full text-emerald-700 hover:bg-emerald-100 rounded border border-dashed border-emerald-300 py-0.5"
                            onClick={() => { setEmpleadoAAsignar(""); setTurnoAAsignar(turno); }}
                          >
                            + Asignar
                          </button>
                        )}
                      </div>
                    );
                  })}

                  {puedeGestionar && (
                    <button
                      type="button"
                      className="mt-auto text-xs text-gray-400 hover:text-emerald-700 hover:bg-gray-50 rounded border border-dashed py-1"
                      onClick={() => abrirNuevoTurno(fecha)}
                    >
                      + Turno
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Dialog: nuevo turno */}
      <Dialog open={dialogTurnoAbierto} onOpenChange={setDialogTurnoAbierto}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nuevo turno</DialogTitle>
            <DialogDescription>
              Definí la fecha, el horario y el puesto del turno.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={guardarTurno} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fecha">Fecha *</Label>
              <Input
                id="fecha"
                type="date"
                value={formTurno.fecha}
                onChange={(e) => setFormTurno({ ...formTurno, fecha: e.target.value })}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="hora_inicio">Hora inicio *</Label>
                <Input
                  id="hora_inicio"
                  type="time"
                  value={formTurno.hora_inicio}
                  onChange={(e) => setFormTurno({ ...formTurno, hora_inicio: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="hora_fin">Hora fin *</Label>
                <Input
                  id="hora_fin"
                  type="time"
                  value={formTurno.hora_fin}
                  onChange={(e) => setFormTurno({ ...formTurno, hora_fin: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Puesto</Label>
              <Select
                value={formTurno.id_puesto}
                onValueChange={(v) => setFormTurno({ ...formTurno, id_puesto: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar puesto" />
                </SelectTrigger>
                <SelectContent>
                  {catalogos.puestos.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>{p.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogTurnoAbierto(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={guardando}>
                {guardando ? "Guardando..." : "Guardar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog: asignar empleado */}
      <Dialog open={!!turnoAAsignar} onOpenChange={(abierto) => !abierto && setTurnoAAsignar(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Asignar empleado</DialogTitle>
            <DialogDescription>
              {turnoAAsignar && (
                <>
                  Turno del {formatearFecha(turnoAAsignar.fecha)} de{" "}
                  {horaCorta(turnoAAsignar.hora_inicio)} a {horaCorta(turnoAAsignar.hora_fin)}
                  {turnoAAsignar.id_puesto && <> — {nombrePuesto[turnoAAsignar.id_puesto]}</>}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Empleado</Label>
            <Select value={empleadoAAsignar} onValueChange={setEmpleadoAAsignar}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar empleado" />
              </SelectTrigger>
              <SelectContent>
                {empleados.map((emp) => (
                  <SelectItem key={emp.empleado_id} value={String(emp.empleado_id)}>
                    {emp.nombre} {emp.apellido}{emp.puesto ? ` — ${emp.puesto}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTurnoAAsignar(null)}>
              Cancelar
            </Button>
            <Button onClick={asignar} disabled={guardando}>
              {guardando ? "Asignando..." : "Asignar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: confirmar borrado de turno */}
      <Dialog open={!!turnoABorrar} onOpenChange={(abierto) => !abierto && setTurnoABorrar(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Eliminar turno</DialogTitle>
            <DialogDescription>
              {turnoABorrar && (
                <>
                  ¿Seguro que querés eliminar el turno del{" "}
                  <strong>{formatearFecha(turnoABorrar.fecha)}</strong> de{" "}
                  {horaCorta(turnoABorrar.hora_inicio)} a {horaCorta(turnoABorrar.hora_fin)}?
                  También se eliminan sus asignaciones. Esta acción no se puede deshacer.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTurnoABorrar(null)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={confirmarBorradoTurno}>
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
