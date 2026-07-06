import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { toast } from "sonner";
import Layout from "@/components/Layout";
import { useAuth } from "@/context/AuthContext";
import {
  getUsuarios,
  getRoles,
  createUsuario,
  updateUsuario,
  deleteUsuario,
} from "@/services/usuarios.services";
import { getEmpleadosDetalle } from "@/services/empleados.services";

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

const FORM_VACIO = { email: "", password: "", id_rol: "", id_empleado: "" };

export default function Usuarios() {
  const { usuario: sesion, tienePermiso } = useAuth();

  const [usuarios, setUsuarios] = useState([]);
  const [roles, setRoles] = useState([]);
  const [empleados, setEmpleados] = useState([]);
  const [loading, setLoading] = useState(true);

  const [dialogAbierto, setDialogAbierto] = useState(false);
  const [form, setForm] = useState(FORM_VACIO);
  const [guardando, setGuardando] = useState(false);
  const [usuarioABorrar, setUsuarioABorrar] = useState(null);

  const cargarDatos = async () => {
    try {
      const [listaUsuarios, listaRoles, listaEmpleados] = await Promise.all([
        getUsuarios(),
        getRoles(),
        getEmpleadosDetalle(),
      ]);
      setUsuarios(listaUsuarios);
      setRoles(listaRoles);
      setEmpleados(listaEmpleados);
    } catch (error) {
      toast.error(error.response?.data?.error || "No se pudieron cargar los usuarios");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  // Guard de permiso (después de los hooks para cumplir las reglas de React)
  if (!tienePermiso("USUARIOS_VER")) {
    return <Navigate to="/" replace />;
  }

  // Solo empleados sin usuario pueden vincularse en el alta
  const empleadosSinUsuario = empleados.filter((e) => !e.usuario_id);

  const abrirAlta = () => {
    setForm(FORM_VACIO);
    setDialogAbierto(true);
  };

  const guardar = async (e) => {
    e.preventDefault();
    setGuardando(true);
    try {
      await createUsuario({
        email: form.email.trim(),
        password: form.password,
        id_rol: Number(form.id_rol),
        id_empleado: form.id_empleado ? Number(form.id_empleado) : null,
      });
      toast.success("Usuario creado correctamente");
      setDialogAbierto(false);
      await cargarDatos();
    } catch (error) {
      toast.error(error.response?.data?.error || "No se pudo crear el usuario");
    } finally {
      setGuardando(false);
    }
  };

  const cambiarActivo = async (u) => {
    try {
      await updateUsuario(u.id, { activo: !u.activo });
      toast.success(u.activo ? "Usuario desactivado" : "Usuario activado");
      await cargarDatos();
    } catch (error) {
      toast.error(error.response?.data?.error || "No se pudo actualizar el usuario");
    }
  };

  const confirmarBorrado = async () => {
    try {
      await deleteUsuario(usuarioABorrar.id);
      toast.success("Usuario eliminado correctamente");
      setUsuarioABorrar(null);
      await cargarDatos();
    } catch (error) {
      toast.error(error.response?.data?.error || "No se pudo eliminar el usuario");
    }
  };

  return (
    <Layout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">Gestión de Usuarios</h2>
          {tienePermiso("USUARIOS_CREAR") && (
            <Button onClick={abrirAlta}>Nuevo usuario</Button>
          )}
        </div>

        {loading ? (
          <p className="text-gray-500">Cargando usuarios...</p>
        ) : (
          <div className="bg-white rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Empleado vinculado</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {usuarios.map((u) => {
                  const esSesionActual = u.id === sesion.id;
                  return (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">
                        {u.email}
                        {esSesionActual && (
                          <span className="ml-2 text-xs text-emerald-600">(vos)</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {u.rol ? <Badge variant="outline">{u.rol}</Badge> : "—"}
                      </TableCell>
                      <TableCell>
                        {u.empleado_id
                          ? `${u.empleado_nombre} ${u.empleado_apellido}`
                          : "—"}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            u.activo
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {u.activo ? "Activo" : "Inactivo"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        {tienePermiso("USUARIOS_EDITAR") && !esSesionActual && (
                          <Button variant="outline" size="sm" onClick={() => cambiarActivo(u)}>
                            {u.activo ? "Desactivar" : "Activar"}
                          </Button>
                        )}
                        {tienePermiso("USUARIOS_ELIMINAR") && !esSesionActual && (
                          <Button variant="destructive" size="sm" onClick={() => setUsuarioABorrar(u)}>
                            Eliminar
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Dialog: nuevo usuario */}
      <Dialog open={dialogAbierto} onOpenChange={setDialogAbierto}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nuevo usuario</DialogTitle>
            <DialogDescription>
              Credenciales de acceso al sistema. Opcionalmente vinculalo a un empleado.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={guardar} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña * (mínimo 8 caracteres)</Label>
              <Input
                id="password"
                type="password"
                minLength={8}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Rol *</Label>
              <Select value={form.id_rol} onValueChange={(v) => setForm({ ...form, id_rol: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar rol" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((r) => (
                    <SelectItem key={r.id} value={String(r.id)}>{r.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Empleado a vincular (opcional)</Label>
              <Select
                value={form.id_empleado}
                onValueChange={(v) => setForm({ ...form, id_empleado: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sin vincular" />
                </SelectTrigger>
                <SelectContent>
                  {empleadosSinUsuario.map((e) => (
                    <SelectItem key={e.empleado_id} value={String(e.empleado_id)}>
                      {e.nombre} {e.apellido}{e.puesto ? ` — ${e.puesto}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {empleadosSinUsuario.length === 0 && (
                <p className="text-xs text-gray-400">
                  Todos los empleados ya tienen usuario asociado.
                </p>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogAbierto(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={guardando || !form.id_rol}>
                {guardando ? "Guardando..." : "Guardar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog: confirmar borrado */}
      <Dialog open={!!usuarioABorrar} onOpenChange={(abierto) => !abierto && setUsuarioABorrar(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Eliminar usuario</DialogTitle>
            <DialogDescription>
              ¿Seguro que querés eliminar el usuario <strong>{usuarioABorrar?.email}</strong>?
              Si tiene un empleado vinculado, el empleado se conserva pero pierde el acceso al sistema.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUsuarioABorrar(null)}>
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
