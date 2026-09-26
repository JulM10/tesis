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
  corregirAsistencia,
} from "@/services/horarios.services";
import EstadoAsistencia from "@/components/EstadoAsistencia";
import { ahoraArgentina, estadoAsistencia, esCorregible } from "@/lib/asistencia";
import { getCatalogos } from "@/services/empleados.services";
import BuscadorEmpleado from "@/components/BuscadorEmpleado";
import {
  hoyISO,
  lunesDeSemana,
  sumarDias,
  soloFecha,
  formatearFecha,
  horaCorta,
  NOMBRES_DIAS,
} from "@/lib/fechas";
import { COLOR_NEUTRO, tinte } from "@/lib/colores";

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

/*
  Con todos los puestos a la vez la grilla se satura: el calendario abre
  filtrado por un puesto. Si "Mozo" ya no existe (se renombró o borró
  desde Configuración), abre con el primero de la lista.
*/
const PUESTO_POR_DEFECTO = "Mozo";

const puestoInicial = (puestos) => {
  const puesto = puestos.find((p) => p.nombre === PUESTO_POR_DEFECTO) ?? puestos[0];
  return puesto ? String(puesto.id) : "todos";
};

const PuntoColor = ({ color }) => (
  <span
    className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
    style={{ backgroundColor: color ?? COLOR_NEUTRO }}
    aria-hidden="true"
  />
);

export default function Calendario() {
  const { tienePermiso } = useAuth();

  const [lunes, setLunes] = useState(lunesDeSemana(hoyISO()));
  const [turnos, setTurnos] = useState([]);
  const [asignaciones, setAsignaciones] = useState([]);
  const [catalogos, setCatalogos] = useState({ puestos: [], lugares: [], estados: [] });
  const [loading, setLoading] = useState(true);

  // Filtros. El de puesto arranca en null y se define al llegar los catálogos.
  const [filtroPuesto, setFiltroPuesto] = useState(null);
  const [filtroEmpleado, setFiltroEmpleado] = useState("todos");

  // Dialogs
  const [formTurno, setFormTurno] = useState(FORM_TURNO_VACIO);
  const [dialogTurnoAbierto, setDialogTurnoAbierto] = useState(false);
  const [turnoAAsignar, setTurnoAAsignar] = useState(null);
  // Objeto { id, nombre, apellido, puesto } que devuelve el buscador, o null
  const [empleadoAAsignar, setEmpleadoAAsignar] = useState(null);
  const [turnoABorrar, setTurnoABorrar] = useState(null);
  const [guardando, setGuardando] = useState(false);

  // Corrección de asistencia: { asignado, turno } y las marcas del formulario
  const [asistenciaAEditar, setAsistenciaAEditar] = useState(null);
  const [marcas, setMarcas] = useState({ hora_ingreso: "", hora_egreso: "" });

  // Hora argentina para derivar el estado de asistencia; se actualiza cada minuto.
  const [ahora, setAhora] = useState(ahoraArgentina);

  const cargarDatos = async () => {
    try {
      const [listaTurnos, listaAsignaciones, listaCatalogos] = await Promise.all([
        getCalendario(),
        getAllHorarios(),
        getCatalogos(),
      ]);
      setTurnos(listaTurnos);
      setAsignaciones(listaAsignaciones);
      setCatalogos(listaCatalogos);
      // Solo en la primera carga: después se respeta lo que eligió el usuario.
      setFiltroPuesto((actual) => actual ?? puestoInicial(listaCatalogos.puestos));
      /*
        Si al empleado filtrado se le quitó su última asignación, su id ya no
        está en la lista: sin esto la grilla quedaría vacía y sin forma de
        volver, porque el filtro apunta a alguien que no figura.
      */
      setFiltroEmpleado((actual) =>
        actual === "todos" ||
        listaAsignaciones.some((a) => String(a.empleado_id) === actual)
          ? actual
          : "todos"
      );
    } catch (error) {
      toast.error(error.response?.data?.error || "No se pudo cargar el calendario");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // El efecto no puede ser async: la IIFE deja las actualizaciones de
    // estado fuera de su cuerpo síncrono (react-hooks/set-state-in-effect).
    (async () => { await cargarDatos(); })();
  }, []);

  useEffect(() => {
    const reloj = setInterval(() => setAhora(ahoraArgentina()), 60 * 1000);
    return () => clearInterval(reloj);
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

  const colorPuesto = useMemo(() => {
    const mapa = {};
    catalogos.puestos.forEach((p) => (mapa[p.id] = p.color));
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

  /*
    Los empleados del filtro salen de las asignaciones que ya están en
    pantalla, no de un listado aparte: filtrar es comparar ids contra esas
    mismas asignaciones, así que traer el padrón completo era al pedo.
  */
  const empleadosConTurnos = useMemo(() => {
    const porId = new Map();
    asignaciones.forEach((a) =>
      porId.set(a.empleado_id, `${a.empleado_nombre} ${a.empleado_apellido}`)
    );
    return [...porId].sort((a, b) => a[1].localeCompare(b[1]));
  }, [asignaciones]);

  // Turnos visibles según filtros, agrupados por día
  const turnosPorDia = useMemo(() => {
    const mapa = {};
    turnos
      .filter((t) => {
        if (filtroPuesto && filtroPuesto !== "todos" && t.id_puesto !== Number(filtroPuesto)) {
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
        id_empleado: empleadoAAsignar.id,
        id_calendario: turnoAAsignar.id,
      });
      toast.success("Empleado asignado al turno");
      setTurnoAAsignar(null);
      setEmpleadoAAsignar(null);
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

  const abrirAsistencia = (asignado, turno) => {
    setMarcas({
      hora_ingreso: horaCorta(asignado.hora_ingreso),
      hora_egreso: horaCorta(asignado.hora_egreso),
    });
    setAsistenciaAEditar({ asignado, turno });
  };

  const guardarAsistencia = async (e) => {
    e.preventDefault();
    const { asignado, turno } = asistenciaAEditar;
    setGuardando(true);
    try {
      await corregirAsistencia(asignado.empleado_id, turno.id, {
        hora_ingreso: marcas.hora_ingreso || null,
        hora_egreso: marcas.hora_egreso || null,
      });
      toast.success("Asistencia actualizada");
      setAsistenciaAEditar(null);
      await cargarDatos();
    } catch (error) {
      toast.error(error.response?.data?.error || "No se pudo guardar la asistencia");
    } finally {
      setGuardando(false);
    }
  };

  const puedeGestionar = tienePermiso("CALENDARIO_CREAR");
  const puedeEliminar = tienePermiso("CALENDARIO_ELIMINAR");
  // La asistencia de los demás solo la ven RRHH y el administrador: el
  // backend ni siquiera la envía al rol EMPLEADO (una licencia por
  // enfermedad es un dato de salud).
  const verAsistencia = tienePermiso("EMPLEADOS_VER");
  const puedeCorregir = tienePermiso("CALENDARIO_EDITAR");

  return (
    <Layout>
      <div className="space-y-4">
        {/* Encabezado y controles */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-bold">Calendario de Turnos</h2>
          <div className="flex w-full items-center gap-2 sm:w-auto">
            {/* En celular no entran las etiquetas largas: queda la flecha sola */}
            <Button
              variant="outline"
              size="sm"
              aria-label="Semana anterior"
              onClick={() => setLunes(sumarDias(lunes, -7))}
            >
              ←<span className="ml-1 hidden sm:inline">Semana anterior</span>
            </Button>
            <Button variant="outline" size="sm" onClick={() => setLunes(lunesDeSemana(hoyISO()))}>
              Hoy
            </Button>
            <Button
              variant="outline"
              size="sm"
              aria-label="Semana siguiente"
              onClick={() => setLunes(sumarDias(lunes, 7))}
            >
              <span className="mr-1 hidden sm:inline">Semana siguiente</span>→
            </Button>
            {puedeGestionar && (
              <Button size="sm" className="ml-auto sm:ml-0" onClick={() => abrirNuevoTurno()}>
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
          <div className="flex w-full flex-col gap-2 sm:ml-auto sm:w-auto sm:flex-row sm:items-center">
            <Select value={filtroPuesto ?? ""} onValueChange={setFiltroPuesto}>
              <SelectTrigger className="w-full sm:w-44" aria-label="Filtrar por puesto">
                <SelectValue placeholder="Puesto" />
              </SelectTrigger>
              <SelectContent>
                {catalogos.puestos.map((p) => (
                  <SelectItem key={p.id} value={String(p.id)}>
                    <span className="flex items-center gap-2">
                      <PuntoColor color={p.color} />
                      {p.nombre}
                    </span>
                  </SelectItem>
                ))}
                <SelectItem value="todos">Todos los puestos</SelectItem>
              </SelectContent>
            </Select>
            {/* Solo RRHH y el administrador: para el rol EMPLEADO el filtro
                por persona nunca estuvo disponible. */}
            {tienePermiso("EMPLEADOS_VER") && empleadosConTurnos.length > 0 && (
              <Select value={filtroEmpleado} onValueChange={setFiltroEmpleado}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Empleado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los empleados</SelectItem>
                  {empleadosConTurnos.map(([id, nombre]) => (
                    <SelectItem key={id} value={String(id)}>
                      {nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        {/* Con todos los puestos a la vista, la leyenda dice qué color es cada uno */}
        {filtroPuesto === "todos" && catalogos.puestos.length > 0 && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-600">
            {catalogos.puestos.map((p) => (
              <span key={p.id} className="flex items-center gap-1.5">
                <PuntoColor color={p.color} />
                {p.nombre}
              </span>
            ))}
          </div>
        )}

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
                  className={`bg-white rounded-lg border p-2 min-h-24 sm:min-h-40 flex flex-col gap-2 ${
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
                    const color = colorPuesto[turno.id_puesto] ?? COLOR_NEUTRO;
                    return (
                      <div
                        key={turno.id}
                        className="rounded-md border border-l-4 p-2 text-xs space-y-1"
                        style={{
                          borderColor: tinte(color, "55"),
                          borderLeftColor: color,
                          backgroundColor: tinte(color, "14"),
                        }}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-semibold text-gray-800">
                            {horaCorta(turno.hora_inicio)}–{horaCorta(turno.hora_fin)}
                          </span>
                          {puedeEliminar && (
                            <button
                              type="button"
                              title="Eliminar turno"
                              className="-m-1 inline-flex items-center justify-center p-1.5 font-bold text-red-400 hover:text-red-600"
                              onClick={() => setTurnoABorrar(turno)}
                            >
                              ✕
                            </button>
                          )}
                        </div>
                        {turno.id_puesto && (
                          <p className="flex items-center gap-1.5 text-gray-700">
                            <PuntoColor color={color} />
                            {nombrePuesto[turno.id_puesto]}
                          </p>
                        )}

                        <div className="space-y-1">
                          {asignados.map((a) => {
                            // Los turnos futuros siempre estarían "Pendiente": no suman información.
                            const estado =
                              verAsistencia && soloFecha(a.fecha) <= ahora.fecha
                                ? estadoAsistencia(a, ahora)
                                : null;
                            const corregible = puedeCorregir && esCorregible(a, ahora);
                            const marcasTexto = a.hora_ingreso
                              ? `Ingreso ${horaCorta(a.hora_ingreso)} · Salida ${horaCorta(a.hora_egreso) || "—"}`
                              : undefined;
                            const contenido = (
                              <>
                                <span>{a.empleado_nombre} {a.empleado_apellido}</span>
                                {estado && <EstadoAsistencia estado={estado} />}
                              </>
                            );

                            return (
                              <div
                                key={a.empleado_id}
                                className="flex items-center justify-between gap-1 bg-white rounded px-1.5 py-0.5 border"
                                style={{ borderColor: tinte(color, "33") }}
                              >
                                {corregible ? (
                                  <button
                                    type="button"
                                    className="flex min-w-0 flex-1 flex-wrap items-center gap-1 text-left hover:underline"
                                    title={`Cargar o corregir asistencia${marcasTexto ? ` (${marcasTexto})` : ""}`}
                                    onClick={() => abrirAsistencia(a, turno)}
                                  >
                                    {contenido}
                                  </button>
                                ) : (
                                  <span
                                    className="flex min-w-0 flex-1 flex-wrap items-center gap-1"
                                    title={verAsistencia ? marcasTexto : undefined}
                                  >
                                    {contenido}
                                  </span>
                                )}
                                {puedeEliminar && (
                                  <button
                                    type="button"
                                    title="Quitar asignación"
                                    className="-m-1 ml-1 inline-flex items-center justify-center p-1.5 text-gray-400 hover:text-red-600"
                                    onClick={() => quitarAsignacion(a, turno.id)}
                                  >
                                    ✕
                                  </button>
                                )}
                              </div>
                            );
                          })}
                          {asignados.length === 0 && (
                            <p className="text-gray-400 italic">Sin asignar</p>
                          )}
                        </div>

                        {puedeGestionar && (
                          <button
                            type="button"
                            className="w-full rounded border border-dashed py-0.5 text-gray-600 hover:bg-white/70"
                            style={{ borderColor: tinte(color, "88") }}
                            onClick={() => { setEmpleadoAAsignar(null); setTurnoAAsignar(turno); }}
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
                className="h-10 sm:h-9"
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
                  className="h-10 sm:h-9"
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
                  className="h-10 sm:h-9"
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
                    <SelectItem key={p.id} value={String(p.id)}>
                      <span className="flex items-center gap-2">
                        <PuntoColor color={p.color} />
                        {p.nombre}
                      </span>
                    </SelectItem>
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
            <Label htmlFor="empleado-asignar">Empleado</Label>
            <BuscadorEmpleado
              id="empleado-asignar"
              valor={empleadoAAsignar}
              onSeleccionar={setEmpleadoAAsignar}
              autoFocus
            />
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

      {/* Dialog: cargar o corregir asistencia */}
      <Dialog
        open={!!asistenciaAEditar}
        onOpenChange={(abierto) => !abierto && setAsistenciaAEditar(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Asistencia</DialogTitle>
            <DialogDescription>
              {asistenciaAEditar && (
                <>
                  {asistenciaAEditar.asignado.empleado_nombre}{" "}
                  {asistenciaAEditar.asignado.empleado_apellido} — turno del{" "}
                  {formatearFecha(asistenciaAEditar.turno.fecha)} de{" "}
                  {horaCorta(asistenciaAEditar.turno.hora_inicio)} a{" "}
                  {horaCorta(asistenciaAEditar.turno.hora_fin)}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={guardarAsistencia} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="asistencia-ingreso">Ingreso</Label>
                <Input
                  id="asistencia-ingreso"
                  type="time"
                  className="h-10 sm:h-9"
                  value={marcas.hora_ingreso}
                  onChange={(e) => setMarcas({ ...marcas, hora_ingreso: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="asistencia-egreso">Salida</Label>
                <Input
                  id="asistencia-egreso"
                  type="time"
                  className="h-10 sm:h-9"
                  value={marcas.hora_egreso}
                  onChange={(e) => setMarcas({ ...marcas, hora_egreso: e.target.value })}
                />
              </div>
            </div>
            <p className="text-xs text-gray-500">
              Dejá un campo vacío para borrar esa marca. Se puede corregir hasta el día
              siguiente al turno; después queda fijo en el historial. Una falta justificada
              se carga como licencia desde la ficha del empleado.
            </p>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAsistenciaAEditar(null)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={guardando}>
                {guardando ? "Guardando..." : "Guardar"}
              </Button>
            </DialogFooter>
          </form>
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
