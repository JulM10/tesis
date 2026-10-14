import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { cambiarPassword } from "@/services/auth.services";
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

/*
  Cambio de la contraseña propia. Un solo componente para los dos casos:

  - `obligatorio`: se abre solo cuando la sesión trae
    debe_cambiar_password = true, y NO se puede cerrar. Es el que hace
    cierto lo que promete el alta de un empleado y el reseteo de una
    cuenta ("el sistema le va a exigir cambiarla al ingresar"), y el que
    saca al usuario del callejón de la contraseña temporal.
  - voluntario: se abre desde Mi Perfil y se cancela normalmente.

  El backend resuelve de quién es la contraseña desde el token, así que
  esto solo cambia la propia. La de otro usuario únicamente la resetea el
  ADMINISTRADOR, desde Usuarios.
*/

// Igual que el backend (auth.services.js). Se valida acá para no gastar un viaje.
const MIN_LARGO = 8;

const FORM_VACIO = { actual: "", nueva: "", repetir: "" };

export default function CambioPassword({ obligatorio = false, abierto = false, onCerrar }) {
  const { usuario, renovarSesion } = useAuth();
  const [form, setForm] = useState(FORM_VACIO);
  const [guardando, setGuardando] = useState(false);

  const debeCambiar = usuario?.debe_cambiar_password === true;
  const visible = obligatorio ? debeCambiar : abierto;

  const setCampo = (campo) => (e) => setForm({ ...form, [campo]: e.target.value });

  /*
    Vaciar el formulario al cerrar y no en un efecto sobre `visible`:
    el proyecto prohíbe setState dentro de efectos
    (react-hooks/set-state-in-effect). Como el diálogo obligatorio solo
    se cierra al guardar bien, estas dos salidas cubren todos los casos.
  */
  const cerrar = () => {
    setForm(FORM_VACIO);
    onCerrar?.();
  };

  const guardar = async (e) => {
    e.preventDefault();

    const { actual, nueva, repetir } = form;

    if (!actual || !nueva || !repetir) {
      toast.error("Completá los tres campos");
      return;
    }
    if (nueva.length < MIN_LARGO) {
      toast.error(`La nueva contraseña debe tener al menos ${MIN_LARGO} caracteres`);
      return;
    }
    if (nueva === actual) {
      toast.error("La nueva contraseña debe ser distinta de la actual");
      return;
    }
    // Esta solo existe del lado del cliente: el backend no recibe la repetición.
    if (nueva !== repetir) {
      toast.error("La nueva contraseña y su repetición no coinciden");
      return;
    }

    setGuardando(true);

    try {
      await cambiarPassword({ password_actual: actual, password_nueva: nueva });
      /*
        El cambio no devuelve token nuevo: hay que renovar para que el
        contexto reciba debe_cambiar_password en false y el diálogo
        obligatorio se cierre solo.
      */
      await renovarSesion();
      toast.success("Contraseña actualizada correctamente");
      if (obligatorio) setForm(FORM_VACIO); else cerrar();
    } catch (error) {
      /*
        El backend responde 401 con el mismo texto genérico tanto si la
        contraseña actual no coincide como si la cuenta está inactiva. Acá
        el caso real es el primero, así que se dice con claridad en vez de
        mostrar "Credenciales inválidas".
      */
      if (error.response?.status === 401) {
        toast.error("La contraseña actual no es correcta");
      } else {
        toast.error(error.response?.data?.error || "No se pudo cambiar la contraseña");
      }
    } finally {
      setGuardando(false);
    }
  };

  if (!usuario) return null;

  return (
    /*
      Obligatorio: onOpenChange vacío, el mismo recurso que usa
      ControlDeSesion. Radix pide cerrar (Escape, clic afuera, la X) y
      nadie baja el estado, así que el diálogo no se va.
    */
    <Dialog
      open={visible}
      onOpenChange={obligatorio ? () => {} : (estaAbierto) => !estaAbierto && cerrar()}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {obligatorio ? "Cambiá tu contraseña para continuar" : "Cambiar contraseña"}
          </DialogTitle>
          <DialogDescription>
            {obligatorio
              ? "La contraseña con la que entraste es de un solo uso. Elegí una nueva para poder usar el sistema."
              : "Vas a necesitar tu contraseña actual para confirmar el cambio."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={guardar} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password_actual">Contraseña actual *</Label>
            <Input
              id="password_actual"
              type="password"
              placeholder="••••••••"
              autoComplete="current-password"
              className="h-10 sm:h-9"
              value={form.actual}
              onChange={setCampo("actual")}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password_nueva">Contraseña nueva *</Label>
            <Input
              id="password_nueva"
              type="password"
              placeholder="••••••••"
              autoComplete="new-password"
              className="h-10 sm:h-9"
              value={form.nueva}
              onChange={setCampo("nueva")}
              required
            />
            <p className="text-xs text-gray-500">
              Al menos {MIN_LARGO} caracteres, y distinta de la actual.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password_repetir">Repetir la nueva *</Label>
            <Input
              id="password_repetir"
              type="password"
              placeholder="••••••••"
              autoComplete="new-password"
              className="h-10 sm:h-9"
              value={form.repetir}
              onChange={setCampo("repetir")}
              required
            />
          </div>

          <DialogFooter>
            {!obligatorio && (
              <Button type="button" variant="outline" onClick={cerrar}>
                Cancelar
              </Button>
            )}
            <Button type="submit" disabled={guardando}>
              {guardando ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
