import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { toast } from "sonner";
import { Pencil, Plus, Trash2 } from "lucide-react";
import Layout from "@/components/Layout";
import { useAuth } from "@/context/AuthContext";
import { getCatalogos } from "@/services/empleados.services";
import {
  crearItem,
  editarItem,
  eliminarItem,
} from "@/services/establecimiento.services";

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
  };

  const abrirEdicion = (seccion, item) => {
    setFormulario({ seccion, item });
    setNombre(item.nombre);
  };

  const guardar = async (evento) => {
    evento.preventDefault();

    const { seccion, item } = formulario;
    setGuardando(true);

    try {
      if (item) {
        await editarItem(seccion.tipo, item.id, nombre);
        toast.success(`${seccion.singular} actualizado`);
      } else {
        await crearItem(seccion.tipo, nombre);
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
                  <CardHeader className="pb-3 flex flex-row items-start justify-between gap-4">
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
                            <span className="text-sm">{item.nombre}</span>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => abrirEdicion(seccion, item)}
                                aria-label={`Editar ${item.nombre}`}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
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

            <div className="space-y-2 py-4">
              <Label htmlFor="nombre">Nombre</Label>
              <Input
                id="nombre"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                autoFocus
                required
              />
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
