import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { toast } from "sonner";
import Layout from "@/components/Layout";
import { useAuth } from "@/context/AuthContext";
import {
  getUsuarios,
  getRoles,
  updateUsuario,
  deleteUsuario,
  resetPassword,
} from "@/services/usuarios.services";

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

/*
  Gestión de usuarios — solo lectura y edición.

  El alta manual se eliminó: las cuentas se provisionan automáticamente al
  dar de alta un empleado (una cuenta por empleado, con password inicial
  derivada de sus datos).

  Toda mutación (editar email/rol/estado, resetear contraseña, eliminar)
  es exclusiva del ADMINISTRADOR. Se refuerza en dos capas: acá se chequea
  el rol, y en el backend los permisos USUARIOS_CREAR/EDITAR/ELIMINAR solo
  los tiene el administrador (RRHH conserva únicamente USUARIOS_VER).
*/

export default function Usuarios() {
  const { usuario: sesion, tienePermiso, esAdministrador } = useAuth();

  const [usuarios, setUsuarios] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [usuarioABorrar, setUsuarioABorrar] = useState(null);

  // Edición
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState({ email: "", id_rol: "", activo: "true" });
  const [guardando, setGuardando] = useState(false);
  const [reseteando, setReseteando] = useState(false);

  // Contraseña temporal del reset: se muestra una única vez
  const [credenciales, setCredenciales] = useState(null);

  const cargarDatos = async () => {
    try {
      const [listaUsuarios, listaRoles] = await Promise.all([
        getUsuarios(),
        getRoles(),
      ]);
      setUsuarios(listaUsuarios);
      setRoles(listaRoles);
    } catch (error) {
      toast.error(error.response?.data?.error || "No se pudieron cargar los usuarios");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // El efecto no puede ser async: la IIFE deja las actualizaciones de
    // estado fuera de su cuerpo síncrono (react-hooks/set-state-in-effect).
    (async () => { await cargarDatos(); })();
  }, []);

  // Guard de permiso (después de los hooks para cumplir las reglas de React)
  if (!tienePermiso("USUARIOS_VER")) {
    return <Navigate to="/" replace />;
  }

  const abrirEdicion = (u) => {
    setEditando(u);
    setForm({
      email: u.email ?? "",
      id_rol: u.id_rol ? String(u.id_rol) : "",
      activo: String(u.activo),
    });
  };

  const guardar = async (e) => {
    e.preventDefault();
    setGuardando(true);
    try {
      // Solo se envían los campos que realmente cambiaron
      const payload = {};
      if (form.email.trim() !== editando.email) payload.email = form.email.trim();
      // id_rol solo si se eligió uno y difiere (no se manda "sin rol")
      if (form.id_rol && Number(form.id_rol) !== editando.id_rol) {
        payload.id_rol = Number(form.id_rol);
      }
      if ((form.activo === "true") !== editando.activo) payload.activo = form.activo === "true";

      if (Object.keys(payload).length === 0) {
        setEditando(null);
        return;
      }

      await updateUsuario(editando.id, payload);
      toast.success("Usuario actualizado correctamente");
      setEditando(null);
      await cargarDatos();
    } catch (error) {
      toast.error(error.response?.data?.error || "No se pudo actualizar el usuario");
    } finally {
      setGuardando(false);
    }
  };

  const resetear = async () => {
    setReseteando(true);
    try {
      const respuesta = await resetPassword(editando.id);
      setCredenciales({
        email: respuesta.data.email,
        password: respuesta.data.password_temporal,
      });
      setEditando(null);
      await cargarDatos();
    } catch (error) {
      toast.error(error.response?.data?.error || "No se pudo resetear la contraseña");
    } finally {
      setReseteando(false);
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
        <div>
          <h2 className="text-xl font-bold">Gestión de Usuarios</h2>
          <p className="text-sm text-gray-500 mt-1">
            Las cuentas se crean automáticamente al dar de alta un empleado.
            {!esAdministrador && " Solo un administrador puede modificarlas."}
          </p>
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
                  {esAdministrador && <TableHead className="text-right">Acciones</TableHead>}
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
                      {esAdministrador && (
                        <TableCell className="text-right space-x-2">
                          {!esSesionActual && (
                            <>
                              <Button variant="outline" size="sm" onClick={() => abrirEdicion(u)}>
                                Editar
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => setUsuarioABorrar(u)}
                              >
                                Eliminar
                              </Button>
                            </>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Dialog: editar usuario */}
      <Dialog open={!!editando} onOpenChange={(abierto) => !abierto && setEditando(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar usuario</DialogTitle>
            <DialogDescription>
              Modificá el acceso de <strong>{editando?.empleado_id
                ? `${editando.empleado_nombre} ${editando.empleado_apellido}`
                : editando?.email}</strong>.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={guardar} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Rol</Label>
              <Select value={form.id_rol} onValueChange={(v) => setForm({ ...form, id_rol: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Sin rol" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((r) => (
                    <SelectItem key={r.id} value={String(r.id)}>{r.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Estado</Label>
              <Select value={form.activo} onValueChange={(v) => setForm({ ...form, activo: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Activo</SelectItem>
                  <SelectItem value="false">Inactivo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-md border bg-gray-50 px-3 py-2 flex items-center justify-between gap-3">
              <div className="text-sm">
                <p className="font-medium">Contraseña</p>
                <p className="text-xs text-gray-500">
                  No se puede ver (se guarda cifrada). Generá una temporal.
                </p>
              </div>
              <Button type="button" variant="outline" size="sm" disabled={reseteando} onClick={resetear}>
                {reseteando ? "Reseteando..." : "Resetear"}
              </Button>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditando(null)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={guardando}>
                {guardando ? "Guardando..." : "Guardar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog: contraseña temporal (se muestra una sola vez) */}
      <Dialog open={!!credenciales} onOpenChange={(abierto) => !abierto && setCredenciales(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Contraseña reseteada</DialogTitle>
            <DialogDescription>
              Entregale esta contraseña temporal al usuario. No se vuelve a mostrar:
              en el sistema solo queda guardada cifrada.
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
              <Label>Contraseña temporal</Label>
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
