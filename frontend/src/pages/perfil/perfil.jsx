import { useEffect, useState } from "react";
import { toast } from "sonner";
import Layout from "@/components/Layout";
import { getMe, getMisHorarios, updateMisDatos } from "@/services/me.services";
import { hoyISO, soloFecha, formatearFecha, horaCorta } from "@/lib/fechas";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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

export default function Perfil() {
  const [me, setMe] = useState(null);
  const [horarios, setHorarios] = useState([]);
  const [loading, setLoading] = useState(true);

  const [dialogAbierto, setDialogAbierto] = useState(false);
  const [form, setForm] = useState({ telefono: "", direccion: "", notas: "" });
  const [guardando, setGuardando] = useState(false);

  const cargarDatos = async () => {
    try {
      const [datosMe, misHorarios] = await Promise.all([getMe(), getMisHorarios()]);
      setMe(datosMe);
      setHorarios(misHorarios);
    } catch (error) {
      toast.error(error.response?.data?.error || "No se pudo cargar tu perfil");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const empleado = me?.empleado;
  const hoy = hoyISO();
  const proximos = horarios.filter((h) => soloFecha(h.fecha) >= hoy);
  const pasados = horarios.filter((h) => soloFecha(h.fecha) < hoy);

  const abrirEdicion = () => {
    setForm({
      telefono: empleado?.telefono ?? "",
      direccion: empleado?.direccion ?? "",
      notas: empleado?.notas ?? "",
    });
    setDialogAbierto(true);
  };

  const guardar = async (e) => {
    e.preventDefault();
    setGuardando(true);
    try {
      await updateMisDatos({
        telefono: form.telefono.trim() || null,
        direccion: form.direccion.trim() || null,
        notas: form.notas.trim() || null,
      });
      toast.success("Tus datos se actualizaron correctamente");
      setDialogAbierto(false);
      await cargarDatos();
    } catch (error) {
      toast.error(error.response?.data?.error || "No se pudieron guardar tus datos");
    } finally {
      setGuardando(false);
    }
  };

  const TablaTurnos = ({ titulo, filas, vacio }) => (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{titulo}</CardTitle>
      </CardHeader>
      <CardContent>
        {filas.length === 0 ? (
          <p className="text-sm text-gray-400">{vacio}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Horario</TableHead>
                <TableHead>Puesto</TableHead>
                <TableHead>Lugar</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filas.map((h) => (
                <TableRow key={`${h.empleado_id}-${h.calendario_id}`}>
                  <TableCell>{formatearFecha(h.fecha)}</TableCell>
                  <TableCell>
                    {horaCorta(h.hora_inicio)}–{horaCorta(h.hora_fin)}
                  </TableCell>
                  <TableCell>{h.puesto}</TableCell>
                  <TableCell>{h.lugar_trabajo}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );

  return (
    <Layout>
      <div className="space-y-4">
        <h2 className="text-xl font-bold">Mi Perfil</h2>

        {loading ? (
          <p className="text-gray-500">Cargando perfil...</p>
        ) : (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Datos de la cuenta */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Mi cuenta</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <p>
                    <span className="text-gray-500">Email:</span>{" "}
                    <span className="font-medium">{me?.usuario.email}</span>
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500">Rol:</span>
                    {me?.usuario.roles.map((r) => (
                      <Badge key={r} variant="outline">{r}</Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Datos del empleado */}
              <Card>
                <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                  <CardTitle className="text-base">Mis datos</CardTitle>
                  {empleado && (
                    <Button variant="outline" size="sm" onClick={abrirEdicion}>
                      Editar
                    </Button>
                  )}
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {!empleado ? (
                    <p className="text-gray-400">
                      Tu usuario no está vinculado a un empleado (cuenta administrativa).
                    </p>
                  ) : (
                    <>
                      <p>
                        <span className="text-gray-500">Nombre:</span>{" "}
                        <span className="font-medium">
                          {empleado.nombre} {empleado.apellido}
                        </span>
                      </p>
                      <p>
                        <span className="text-gray-500">Puesto:</span>{" "}
                        {empleado.puesto ?? "—"} · {empleado.lugar_trabajo ?? "—"}
                      </p>
                      <p>
                        <span className="text-gray-500">Estado:</span>{" "}
                        {empleado.estado ?? "—"}
                      </p>
                      <p>
                        <span className="text-gray-500">Teléfono:</span>{" "}
                        {empleado.telefono ?? "—"}
                      </p>
                      <p>
                        <span className="text-gray-500">Dirección:</span>{" "}
                        {empleado.direccion ?? "—"}
                      </p>
                      <p>
                        <span className="text-gray-500">Sobre mí:</span>{" "}
                        {empleado.notas ?? "—"}
                      </p>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>

            {empleado && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <TablaTurnos
                  titulo="Mis próximos turnos"
                  filas={proximos}
                  vacio="No tenés turnos próximos asignados."
                />
                <TablaTurnos
                  titulo="Turnos anteriores"
                  filas={pasados.slice(-8).reverse()}
                  vacio="Sin historial de turnos."
                />
              </div>
            )}
          </>
        )}
      </div>

      {/* Dialog: editar mis datos */}
      <Dialog open={dialogAbierto} onOpenChange={setDialogAbierto}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar mis datos</DialogTitle>
            <DialogDescription>
              Podés actualizar tus datos de contacto y tu descripción.
              El puesto y el estado los gestiona RRHH.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={guardar} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="telefono">Teléfono</Label>
              <Input
                id="telefono"
                value={form.telefono}
                onChange={(e) => setForm({ ...form, telefono: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="direccion">Dirección</Label>
              <Input
                id="direccion"
                value={form.direccion}
                onChange={(e) => setForm({ ...form, direccion: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notas">Sobre mí</Label>
              <textarea
                id="notas"
                rows={4}
                className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="Experiencia, disponibilidad horaria, temporadas trabajadas..."
                value={form.notas}
                onChange={(e) => setForm({ ...form, notas: e.target.value })}
              />
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
    </Layout>
  );
}
