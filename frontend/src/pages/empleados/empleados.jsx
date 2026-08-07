import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { toast } from "sonner";
import Layout from "@/components/Layout";
import { useAuth } from "@/context/AuthContext";
import {
  getEmpleadosDetalle,
  createEmpleado,
  updateEmpleado,
  deleteEmpleado,
  getCatalogos,
  subirCV,
  descargarCV,
  eliminarCV,
  descargarBlob,
} from "@/services/empleados.services";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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

const FORM_VACIO = {
  nombre: "",
  apellido: "",
  dni: "",
  email: "",
  fecha_nacimiento: "",
  telefono: "",
  direccion: "",
  notas: "",
  id_puesto: "",
  id_lugar: "",
  id_estado: "",
};

// La edad no se carga: se deriva de la fecha de nacimiento
const calcularEdad = (fechaNacimiento) => {
  if (!fechaNacimiento) return null;
  const hoy = new Date();
  const nacimiento = new Date(fechaNacimiento);
  if (isNaN(nacimiento.getTime())) return null;

  let edad = hoy.getFullYear() - nacimiento.getFullYear();
  const cumplioEsteAño =
    hoy.getMonth() > nacimiento.getMonth() ||
    (hoy.getMonth() === nacimiento.getMonth() && hoy.getDate() >= nacimiento.getDate());
  if (!cumplioEsteAño) edad--;

  return edad >= 0 ? edad : null;
};

// Colores de badge según estado del empleado
const COLOR_ESTADO = {
  Activo: "bg-emerald-100 text-emerald-800",
  Inactivo: "bg-gray-100 text-gray-600",
  Vacaciones: "bg-blue-100 text-blue-800",
  Enfermo: "bg-yellow-100 text-yellow-800",
  Suspendido: "bg-orange-100 text-orange-800",
  Despedido: "bg-red-100 text-red-800",
};

export default function Empleados() {
  const { tienePermiso } = useAuth();

  const [empleados, setEmpleados] = useState([]);
  const [catalogos, setCatalogos] = useState({ puestos: [], lugares: [], estados: [] });
  const [loading, setLoading] = useState(true);

  // Dialog de alta/edición
  const [dialogAbierto, setDialogAbierto] = useState(false);
  const [form, setForm] = useState(FORM_VACIO);
  const [editandoId, setEditandoId] = useState(null);
  const [guardando, setGuardando] = useState(false);

  // Dialog de confirmación de borrado
  const [empleadoABorrar, setEmpleadoABorrar] = useState(null);

  // Credenciales del alta: se muestran una única vez tras crear el empleado
  const [credenciales, setCredenciales] = useState(null);

  // CV adjunto (solo en edición)
  const [cvActual, setCvActual] = useState(null);
  const [archivoCV, setArchivoCV] = useState(null);
  const [subiendoCV, setSubiendoCV] = useState(false);

  const cargarDatos = async () => {
    try {
      const [listaEmpleados, listaCatalogos] = await Promise.all([
        getEmpleadosDetalle(),
        getCatalogos(),
      ]);
      setEmpleados(listaEmpleados);
      setCatalogos(listaCatalogos);
    } catch (error) {
      toast.error(error.response?.data?.error || "No se pudieron cargar los empleados");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // El efecto no puede ser async: la IIFE deja las actualizaciones de
    // estado fuera de su cuerpo síncrono (react-hooks/set-state-in-effect).
    (async () => { await cargarDatos(); })();
  }, []);

  // El rol EMPLEADO no accede a los datos del resto del personal
  if (!tienePermiso("EMPLEADOS_VER")) {
    return <Navigate to="/mi-perfil" replace />;
  }

  const abrirAlta = () => {
    setEditandoId(null);
    setForm(FORM_VACIO);
    setCvActual(null);
    setArchivoCV(null);
    setDialogAbierto(true);
  };

  const abrirEdicion = (empleado) => {
    setEditandoId(empleado.empleado_id);
    setForm({
      nombre: empleado.nombre ?? "",
      apellido: empleado.apellido ?? "",
      dni: empleado.dni ?? "",
      // Solo informativo en edición: el email vive en usuarios y se
      // administra desde la pantalla de Usuarios.
      email: empleado.email ?? "",
      fecha_nacimiento: (empleado.fecha_nacimiento ?? "").slice(0, 10),
      telefono: empleado.telefono ?? "",
      direccion: empleado.direccion ?? "",
      notas: empleado.notas ?? "",
      id_puesto: empleado.id_puesto ? String(empleado.id_puesto) : "",
      id_lugar: empleado.id_lugar ? String(empleado.id_lugar) : "",
      id_estado: empleado.id_estado ? String(empleado.id_estado) : "",
    });
    setCvActual(empleado.cv_nombre ?? null);
    setArchivoCV(null);
    setDialogAbierto(true);
  };

  /* ===== CV adjunto ===== */

  const subirArchivoCV = async () => {
    if (!archivoCV) return;
    setSubiendoCV(true);
    try {
      const resultado = await subirCV(editandoId, archivoCV);
      toast.success("CV subido correctamente");
      setCvActual(resultado.data?.cv_nombre ?? archivoCV.name);
      setArchivoCV(null);
      await cargarDatos();
    } catch (error) {
      toast.error(error.response?.data?.error || "No se pudo subir el CV");
    } finally {
      setSubiendoCV(false);
    }
  };

  const descargarArchivoCV = async () => {
    try {
      const blob = await descargarCV(editandoId);
      descargarBlob(blob, cvActual || "cv");
    } catch (error) {
      toast.error(error.response?.data?.error || "No se pudo descargar el CV");
    }
  };

  const quitarArchivoCV = async () => {
    try {
      await eliminarCV(editandoId);
      toast.success("CV eliminado correctamente");
      setCvActual(null);
      await cargarDatos();
    } catch (error) {
      toast.error(error.response?.data?.error || "No se pudo eliminar el CV");
    }
  };

  const setCampo = (campo) => (e) => setForm({ ...form, [campo]: e.target.value });

  // Convierte el form (strings) al payload que espera la API (números o null)
  const armarPayload = () => ({
    nombre: form.nombre.trim(),
    apellido: form.apellido.trim(),
    dni: form.dni.trim(),
    // El email solo viaja en el alta: es la identidad de la cuenta que se
    // crea junto al empleado. En edición se modifica desde Usuarios.
    ...(editandoId ? {} : { email: form.email.trim() }),
    fecha_nacimiento: form.fecha_nacimiento || null,
    telefono: form.telefono.trim() || null,
    direccion: form.direccion.trim() || null,
    notas: form.notas.trim() || null,
    id_puesto: form.id_puesto ? Number(form.id_puesto) : null,
    id_lugar: form.id_lugar ? Number(form.id_lugar) : null,
    id_estado: form.id_estado ? Number(form.id_estado) : null,
  });

  const guardar = async (e) => {
    e.preventDefault();
    setGuardando(true);

    try {
      if (editandoId) {
        await updateEmpleado(editandoId, armarPayload());
        toast.success("Empleado actualizado correctamente");
      } else {
        const respuesta = await createEmpleado(armarPayload());
        toast.success("Empleado creado correctamente");
        /*
          La password inicial viaja UNA sola vez, en esta respuesta.
          Se muestra en un diálogo aparte porque es el único momento en
          que existe en claro: después solo queda su hash en la BD.
        */
        setCredenciales({
          nombre: `${respuesta.data.nombre} ${respuesta.data.apellido}`,
          email: respuesta.data.email,
          password: respuesta.data.password_inicial,
        });
      }
      setDialogAbierto(false);
      await cargarDatos();
    } catch (error) {
      toast.error(
        error.response?.data?.error ||
        error.response?.data?.message ||
        "No se pudo guardar el empleado"
      );
    } finally {
      setGuardando(false);
    }
  };

  const confirmarBorrado = async () => {
    try {
      await deleteEmpleado(empleadoABorrar.empleado_id);
      toast.success("Empleado eliminado correctamente");
      setEmpleadoABorrar(null);
      await cargarDatos();
    } catch (error) {
      toast.error(error.response?.data?.error || "No se pudo eliminar el empleado");
    }
  };

  return (
    <Layout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">Gestión de Empleados</h2>
          {tienePermiso("EMPLEADOS_CREAR") && (
            <Button onClick={abrirAlta}>Nuevo empleado</Button>
          )}
        </div>

        {loading ? (
          <p className="text-gray-500">Cargando empleados...</p>
        ) : (
          <div className="bg-white rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>DNI</TableHead>
                  <TableHead>Puesto</TableHead>
                  <TableHead>Lugar</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Teléfono</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {empleados.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-gray-500">
                      No hay empleados registrados
                    </TableCell>
                  </TableRow>
                )}
                {empleados.map((emp) => (
                  <TableRow key={emp.empleado_id}>
                    <TableCell className="font-medium">
                      {emp.nombre} {emp.apellido}
                    </TableCell>
                    <TableCell>{emp.dni ?? "—"}</TableCell>
                    <TableCell>{emp.puesto ?? "—"}</TableCell>
                    <TableCell>{emp.lugar_trabajo ?? "—"}</TableCell>
                    <TableCell>
                      {emp.estado ? (
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${COLOR_ESTADO[emp.estado] ?? "bg-gray-100 text-gray-600"}`}>
                          {emp.estado}
                        </span>
                      ) : "—"}
                    </TableCell>
                    <TableCell>{emp.telefono ?? "—"}</TableCell>
                    <TableCell>{emp.email ?? "—"}</TableCell>
                    <TableCell className="text-right space-x-2">
                      {tienePermiso("EMPLEADOS_EDITAR") && (
                        <Button variant="outline" size="sm" onClick={() => abrirEdicion(emp)}>
                          Editar
                        </Button>
                      )}
                      {tienePermiso("EMPLEADOS_ELIMINAR") && (
                        <Button variant="destructive" size="sm" onClick={() => setEmpleadoABorrar(emp)}>
                          Eliminar
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Dialog de alta / edición */}
      <Dialog open={dialogAbierto} onOpenChange={setDialogAbierto}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {editandoId ? "Editar empleado" : "Nuevo empleado"}
            </DialogTitle>
            <DialogDescription>
              {editandoId
                ? "Modificá los datos del empleado."
                : "Al guardar se crea automáticamente su cuenta de acceso con el email indicado. La contraseña inicial se genera a partir de su nombre y DNI, y deberá cambiarla en el primer ingreso."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={guardar} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Columna izquierda: información personal y puesto */}
              <div className="grid grid-cols-2 gap-4 content-start">
                <div className="space-y-2">
                  <Label htmlFor="nombre">Nombre *</Label>
                  <Input id="nombre" value={form.nombre} onChange={setCampo("nombre")} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="apellido">Apellido *</Label>
                  <Input id="apellido" value={form.apellido} onChange={setCampo("apellido")} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dni">DNI *</Label>
                  <Input
                    id="dni"
                    value={form.dni}
                    onChange={setCampo("dni")}
                    placeholder="20123456"
                    inputMode="numeric"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email {editandoId ? "" : "*"}</Label>
                  <Input
                    id="email"
                    type="email"
                    value={form.email}
                    onChange={setCampo("email")}
                    placeholder="nombre.apellido@hotel.com"
                    required={!editandoId}
                    disabled={!!editandoId}
                    readOnly={!!editandoId}
                    title={
                      editandoId
                        ? "El email es la identidad de la cuenta: se administra desde Usuarios"
                        : "Con este email se crea la cuenta de acceso del empleado"
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fecha_nacimiento">Fecha de nacimiento</Label>
                  <Input
                    id="fecha_nacimiento"
                    type="date"
                    max={new Date().toISOString().slice(0, 10)}
                    value={form.fecha_nacimiento}
                    onChange={setCampo("fecha_nacimiento")}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edad">Edad</Label>
                  <Input
                    id="edad"
                    value={calcularEdad(form.fecha_nacimiento) ?? "—"}
                    disabled
                    readOnly
                    title="Se calcula automáticamente desde la fecha de nacimiento"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="telefono">Teléfono</Label>
                  <Input id="telefono" value={form.telefono} onChange={setCampo("telefono")} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="direccion">Dirección</Label>
                  <Input id="direccion" value={form.direccion} onChange={setCampo("direccion")} />
                </div>
                <div className="space-y-2">
                  <Label>Puesto</Label>
                  <Select value={form.id_puesto} onValueChange={(v) => setForm({ ...form, id_puesto: v })}>
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
                <div className="space-y-2">
                  <Label>Lugar de trabajo</Label>
                  <Select value={form.id_lugar} onValueChange={(v) => setForm({ ...form, id_lugar: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar lugar" />
                    </SelectTrigger>
                    <SelectContent>
                      {catalogos.lugares.map((l) => (
                        <SelectItem key={l.id} value={String(l.id)}>{l.nombre}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Estado</Label>
                  <Select value={form.id_estado} onValueChange={(v) => setForm({ ...form, id_estado: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar estado" />
                    </SelectTrigger>
                    <SelectContent>
                      {catalogos.estados.map((s) => (
                        <SelectItem key={s.id} value={String(s.id)}>{s.nombre}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Columna derecha: descripción y CV */}
              <div className="space-y-4 content-start">
                <div className="space-y-2">
                  <Label htmlFor="notas">Notas / Descripción</Label>
                  <textarea
                    id="notas"
                    rows={10}
                    className="w-full resize-none rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="Experiencia, referencias, temporadas trabajadas, observaciones..."
                    value={form.notas}
                    onChange={setCampo("notas")}
                  />
                </div>

                <div className="space-y-2">
                  <Label>CV adjunto (PDF o DOCX, máx. 5MB)</Label>
                {!editandoId ? (
                  <p className="text-xs text-gray-400">
                    Guardá el empleado primero para poder adjuntar su CV.
                  </p>
                ) : (
                  <>
                    {cvActual ? (
                      <div className="flex items-center gap-2 text-sm bg-gray-50 rounded-md px-2 py-1.5">
                        <span className="truncate flex-1">📄 {cvActual}</span>
                        <Button type="button" variant="outline" size="sm" onClick={descargarArchivoCV}>
                          Descargar
                        </Button>
                        <Button type="button" variant="outline" size="sm" onClick={quitarArchivoCV}>
                          Quitar
                        </Button>
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400">Sin CV cargado.</p>
                    )}
                    <div className="flex items-center gap-2">
                      <input
                        type="file"
                        accept=".pdf,.docx"
                        className="text-sm flex-1"
                        onChange={(e) => setArchivoCV(e.target.files?.[0] ?? null)}
                      />
                      <Button
                        type="button"
                        size="sm"
                        disabled={!archivoCV || subiendoCV}
                        onClick={subirArchivoCV}
                      >
                        {subiendoCV ? "Subiendo..." : cvActual ? "Reemplazar" : "Subir"}
                      </Button>
                    </div>
                  </>
                )}
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogAbierto(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={guardando}>
                {guardando ? "Guardando..." : "Guardar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog: credenciales generadas (se muestran una sola vez) */}
      <Dialog open={!!credenciales} onOpenChange={(abierto) => !abierto && setCredenciales(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cuenta creada</DialogTitle>
            <DialogDescription>
              Entregale estos datos a <strong>{credenciales?.nombre}</strong>. La contraseña
              no se vuelve a mostrar: en el sistema solo queda guardada cifrada.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Email</Label>
              <div className="rounded-md bg-gray-50 border px-3 py-2 font-mono text-sm break-all">
                {credenciales?.email}
              </div>
            </div>
            <div className="space-y-1">
              <Label>Contraseña inicial</Label>
              <div className="rounded-md bg-gray-50 border px-3 py-2 font-mono text-sm break-all">
                {credenciales?.password}
              </div>
            </div>
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
              El sistema le va a exigir cambiar esta contraseña la primera vez que ingrese.
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                navigator.clipboard?.writeText(
                  `Email: ${credenciales.email}\nContraseña: ${credenciales.password}`
                );
                toast.success("Credenciales copiadas");
              }}
            >
              Copiar
            </Button>
            <Button type="button" onClick={() => setCredenciales(null)}>
              Listo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmación de borrado */}
      <Dialog open={!!empleadoABorrar} onOpenChange={(abierto) => !abierto && setEmpleadoABorrar(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Eliminar empleado</DialogTitle>
            <DialogDescription>
              ¿Seguro que querés eliminar a{" "}
              <strong>
                {empleadoABorrar?.nombre} {empleadoABorrar?.apellido}
              </strong>
              ? Esta acción también elimina sus asignaciones de horario y no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEmpleadoABorrar(null)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={confirmarBorrado}>
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
