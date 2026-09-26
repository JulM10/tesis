import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { toast } from "sonner";
import { MonitorSmartphone, Pencil, Plus, Trash2 } from "lucide-react";
import Layout from "@/components/Layout";
import { useAuth } from "@/context/AuthContext";
import { getCatalogos } from "@/services/empleados.services";
import {
  crearItem,
  editarItem,
  eliminarItem,
} from "@/services/establecimiento.services";
import { PALETA_PUESTOS, tinte } from "@/lib/colores";

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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/*
  Las dos entidades editables comparten forma (id + nombre) y operaciones,
  así que la pantalla se arma recorriendo esta lista en lugar de duplicar
  el mismo bloque de JSX dos veces.

  `clave` es cómo viene cada colección dentro de GET /api/catalogos.
*/
const SECCIONES = [
  {
    tipo: "puestos",
    clave: "puestos",
    titulo: "Puestos",
    singular: "puesto",
    descripcion: "Las funciones que cumple el personal (Recepción, Cocina, Mucama…).",
    // Cada puesto tiene un color con el que se pintan sus turnos en el calendario.
    conColor: true,
  },
  {
    tipo: "lugares",
    clave: "lugares",
    titulo: "Lugares de trabajo",
    singular: "lugar de trabajo",
    descripcion: "Los sectores físicos del hotel donde se asigna al personal.",
  },
];

export default function Configuracion() {
  const { tienePermiso } = useAuth();

  const [catalogos, setCatalogos] = useState({ puestos: [], lugares: [], estados: [] });
  const [cargando, setCargando] = useState(true);

  // Dialog de alta / edición. `item` en null significa alta.
  const [formulario, setFormulario] = useState(null);
  const [nombre, setNombre] = useState("");
  const [color, setColor] = useState(PALETA_PUESTOS[0]);
  const [guardando, setGuardando] = useState(false);

  // Dialog de confirmación de borrado
  const [aBorrar, setABorrar] = useState(null);
  const [borrando, setBorrando] = useState(false);

  const cargar = async () => {
    try {
      setCatalogos(await getCatalogos());
    } catch (error) {
      toast.error(error.response?.data?.error || "No se pudieron cargar los datos");
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    // El efecto no puede ser async: la IIFE deja las actualizaciones de
    // estado fuera de su cuerpo síncrono (react-hooks/set-state-in-effect).
    (async () => { await cargar(); })();
  }, []);

  if (!tienePermiso("ESTABLECIMIENTO_EDITAR")) {
    return <Navigate to="/" replace />;
  }

  const abrirAlta = (seccion) => {
    setFormulario({ seccion, item: null });
    setNombre("");
    // Sugiere un color distinto para cada puesto nuevo.
    const cantidad = catalogos[seccion.clave]?.length ?? 0;
    setColor(PALETA_PUESTOS[cantidad % PALETA_PUESTOS.length]);
  };

  const abrirEdicion = (seccion, item) => {
    setFormulario({ seccion, item });
    setNombre(item.nombre);
    setColor(item.color ?? PALETA_PUESTOS[0]);
  };

  const guardar = async (evento) => {
    evento.preventDefault();

    const { seccion, item } = formulario;
    const colorElegido = seccion.conColor ? color : undefined;
    setGuardando(true);

    try {
      if (item) {
        await editarItem(seccion.tipo, item.id, nombre, colorElegido);
        toast.success(`${seccion.singular} actualizado`);
      } else {
        await crearItem(seccion.tipo, nombre, colorElegido);
        toast.success(`${seccion.singular} creado`);
      }

      setFormulario(null);
      await cargar();
    } catch (error) {
      // El backend responde 409 si el nombre ya existe (lo detecta el UNIQUE)
      toast.error(error.response?.data?.error || "No se pudo guardar");
    } finally {
      setGuardando(false);
    }
  };

  const confirmarBorrado = async () => {
    const { seccion, item } = aBorrar;
    setBorrando(true);

    try {
      await eliminarItem(seccion.tipo, item.id);
      toast.success(`${seccion.singular} eliminado`);
      setABorrar(null);
      await cargar();
    } catch (error) {
      /*
        Si está en uso, el backend responde 409 con el detalle
        ("en uso por 3 empleados"): se muestra tal cual porque es
        la información que el usuario necesita para decidir.
      */
      toast.error(error.response?.data?.error || "No se pudo eliminar");
    } finally {
      setBorrando(false);
    }
  };

  return (
    <Layout>
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-bold">Configuración</h2>
          <p className="text-sm text-gray-500">
            Estructura del establecimiento: los puestos y lugares que después se
            asignan a los empleados y a los turnos.
          </p>
        </div>

        {cargando ? (
          <p className="p-6 text-gray-500">Cargando...</p>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {SECCIONES.map((seccion) => {
              const items = catalogos[seccion.clave] ?? [];

              return (
                <Card key={seccion.tipo}>
                  <CardHeader className="pb-3 flex flex-row flex-wrap items-start justify-between gap-4">
                    <div>
                      <CardTitle className="text-base">{seccion.titulo}</CardTitle>
                      <p className="text-sm text-gray-500 mt-1">
                        {seccion.descripcion}
                      </p>
                    </div>
                    <Button size="sm" onClick={() => abrirAlta(seccion)}>
                      <Plus className="h-4 w-4" />
                      Agregar
                    </Button>
                  </CardHeader>

                  <CardContent>
                    {items.length === 0 ? (
                      <p className="text-sm text-gray-400 py-4">
                        No hay {seccion.titulo.toLowerCase()} cargados todavía.
                      </p>
                    ) : (
                      <ul className="divide-y divide-gray-100">
                        {items.map((item) => (
                          <li
                            key={item.id}
                            className="flex items-center justify-between py-2"
                          >
                            <span className="flex items-center gap-2 text-sm">
                              {seccion.conColor && (
                                <span
                                  className="h-3 w-3 shrink-0 rounded-full"
                                  style={{ backgroundColor: item.color }}
                                  aria-hidden="true"
                                />
                              )}
                              {item.nombre}
                            </span>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => abrirEdicion(seccion, item)}
                                aria-label={`Editar ${item.nombre}`}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setABorrar({ seccion, item })}
                                aria-label={`Eliminar ${item.nombre}`}
                              >
                                <Trash2 className="h-4 w-4 text-red-600" />
                              </Button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </CardContent>
                </Card>
              );
            })}

            {/*
              Los estados se muestran pero no se editan: sus nombres están
              acoplados a la lógica de la aplicación (indicadores del panel,
              colores de las etiquetas), así que renombrarlos desde acá
              rompería esas pantallas sin dar ningún error visible.
            */}
            <Card className="lg:col-span-2">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Estados del personal</CardTitle>
                <p className="text-sm text-gray-500 mt-1">
                  Definidos por el sistema. Los indicadores del panel de inicio se
                  calculan a partir de ellos, por eso no se editan desde acá.
                </p>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {(catalogos.estados ?? []).map((estado) => (
                  <Badge key={estado.id} variant="secondary">
                    {estado.nombre}
                  </Badge>
                ))}
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader className="pb-3 flex flex-row flex-wrap items-start justify-between gap-4">
                <div>
                  <CardTitle className="text-base">Kiosco de asistencia</CardTitle>
                  <p className="text-sm text-gray-500 mt-1">
                    Abrí esta pantalla en la PC de recepción: muestra el QR y el código que
                    los empleados usan para marcar ingreso y salida. La primera vez pide la
                    clave del kiosco (variable KIOSCO_CLAVE del servidor).
                  </p>
                </div>
                <Button asChild size="sm" variant="outline">
                  <a href="/kiosco" target="_blank" rel="noopener noreferrer">
                    <MonitorSmartphone className="h-4 w-4" />
                    Abrir kiosco
                  </a>
                </Button>
              </CardHeader>
            </Card>
          </div>
        )}
      </div>

      {/* Alta / edición */}
      <Dialog open={formulario !== null} onOpenChange={() => setFormulario(null)}>
        <DialogContent>
          <form onSubmit={guardar}>
            <DialogHeader>
              <DialogTitle>
                {formulario?.item ? "Editar" : "Agregar"} {formulario?.seccion.singular}
              </DialogTitle>
              <DialogDescription>
                No puede repetirse un nombre ya existente.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre</Label>
                <Input
                  id="nombre"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  autoFocus
                  required
                />
              </div>

              {formulario?.seccion.conColor && (
                <div className="space-y-2">
                  <Label htmlFor="color">Color en el calendario</Label>
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      id="color"
                      type="color"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      className="h-9 w-12 cursor-pointer rounded border border-gray-200 bg-white p-0.5"
                      title="Elegir cualquier color"
                    />
                    {PALETA_PUESTOS.map((opcion) => (
                      <button
                        key={opcion}
                        type="button"
                        onClick={() => setColor(opcion)}
                        className={`h-6 w-6 rounded-full border-2 ${
                          color === opcion ? "border-gray-900" : "border-transparent"
                        }`}
                        style={{ backgroundColor: opcion }}
                        aria-label={`Usar el color ${opcion}`}
                      />
                    ))}
                  </div>
                  {/* Vista previa: así se ve un turno de este puesto en el calendario */}
                  <div
                    className="rounded-md border border-l-4 p-2 text-xs"
                    style={{
                      borderColor: tinte(color, "55"),
                      borderLeftColor: color,
                      backgroundColor: tinte(color, "14"),
                    }}
                  >
                    <p className="font-semibold text-gray-800">08:00–16:00</p>
                    <p className="flex items-center gap-1.5 text-gray-700">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
                      {nombre.trim() || "Nombre del puesto"}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setFormulario(null)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={guardando || !nombre.trim()}>
                {guardando ? "Guardando..." : "Guardar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirmación de borrado */}
      <Dialog open={aBorrar !== null} onOpenChange={() => setABorrar(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar {aBorrar?.seccion.singular}</DialogTitle>
            <DialogDescription>
              ¿Seguro que querés eliminar «{aBorrar?.item.nombre}»? Si hay
              empleados o turnos que lo usan, no se va a poder.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button variant="outline" onClick={() => setABorrar(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={confirmarBorrado}
              disabled={borrando}
            >
              {borrando ? "Eliminando..." : "Eliminar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
