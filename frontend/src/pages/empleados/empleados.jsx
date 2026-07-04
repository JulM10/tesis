import { useEffect, useState } from "react";
import { toast } from "sonner";
import Layout from "@/components/Layout";
import { useAuth } from "@/context/AuthContext";
import {
  getEmpleadosDetalle,
  createEmpleado,
  updateEmpleado,
  deleteEmpleado,
  getCatalogos,
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
  edad: "",
  telefono: "",
  direccion: "",
  id_puesto: "",
  id_lugar: "",
  id_estado: "",
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
    cargarDatos();
  }, []);

  const abrirAlta = () => {
    setEditandoId(null);
    setForm(FORM_VACIO);
    setDialogAbierto(true);
  };

  const abrirEdicion = (empleado) => {
    setEditandoId(empleado.empleado_id);
    setForm({
      nombre: empleado.nombre ?? "",
      apellido: empleado.apellido ?? "",
      edad: empleado.edad ?? "",
      telefono: empleado.telefono ?? "",
      direccion: empleado.direccion ?? "",
      id_puesto: empleado.id_puesto ? String(empleado.id_puesto) : "",
      id_lugar: empleado.id_lugar ? String(empleado.id_lugar) : "",
      id_estado: empleado.id_estado ? String(empleado.id_estado) : "",
    });
    setDialogAbierto(true);
  };

  const setCampo = (campo) => (e) => setForm({ ...form, [campo]: e.target.value });

  // Convierte el form (strings) al payload que espera la API (números o null)
  const armarPayload = () => ({
    nombre: form.nombre.trim(),
    apellido: form.apellido.trim(),
    edad: form.edad === "" ? null : Number(form.edad),
    telefono: form.telefono.trim() || null,
    direccion: form.direccion.trim() || null,
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
        await createEmpleado(armarPayload());
        toast.success("Empleado creado correctamente");
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
                    <TableCell colSpan={7} className="text-center text-gray-500">
                      No hay empleados registrados
                    </TableCell>
                  </TableRow>
                )}
                {empleados.map((emp) => (
                  <TableRow key={emp.empleado_id}>
                    <TableCell className="font-medium">
                      {emp.nombre} {emp.apellido}
                    </TableCell>
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
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editandoId ? "Editar empleado" : "Nuevo empleado"}
            </DialogTitle>
            <DialogDescription>
              {editandoId
                ? "Modificá los datos del empleado."
                : "Completá los datos del nuevo empleado."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={guardar} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre *</Label>
                <Input id="nombre" value={form.nombre} onChange={setCampo("nombre")} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="apellido">Apellido *</Label>
                <Input id="apellido" value={form.apellido} onChange={setCampo("apellido")} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edad">Edad</Label>
                <Input id="edad" type="number" min="16" max="99" value={form.edad} onChange={setCampo("edad")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="telefono">Teléfono</Label>
                <Input id="telefono" value={form.telefono} onChange={setCampo("telefono")} />
              </div>
              <div className="col-span-2 space-y-2">
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
