import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { vencimientoToken } from "@/services/auth.services";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/*
  Cierre de sesión por inactividad.

  Son dos controles distintos y complementarios:

  - El TOKEN vence solo, del lado del servidor (15 min). Limita cuánto
    sirve un token robado y hasta cuándo conserva el acceso una cuenta
    que se dio de baja.
  - La INACTIVIDAD se mide acá (10 min). Protege el puesto de trabajo
    desatendido: en un hotel las PCs son compartidas y alguien que se
    levanta a atender un huésped no debe dejar la sesión abierta.

  Mientras hay actividad, el token se renueva en silencio antes de
  vencer, así que quien está trabajando nunca ve la pantalla de login.
  Cuando no la hay, primero aparece un aviso con cuenta regresiva y
  recién después se cierra la sesión.
*/

const MINUTO = 60 * 1000;

// Sin actividad en este lapso, la sesión se cierra.
const INACTIVIDAD_MAXIMA = 10 * MINUTO;

// Cuánto antes del cierre se muestra el aviso.
const AVISO_PREVIO = MINUTO;

// Se renueva cuando al token le queda menos que esto de vida.
const MARGEN_RENOVACION = 7 * MINUTO;

// Evita renovar en cada movimiento del mouse.
const ESPERA_ENTRE_RENOVACIONES = MINUTO;

const EVENTOS_DE_ACTIVIDAD = [
  "mousedown",
  "keydown",
  "scroll",
  "touchstart",
];

export default function ControlDeSesion() {
  const { usuario, logout, renovarSesion } = useAuth();

  const [avisoVisible, setAvisoVisible] = useState(false);
  const [segundosRestantes, setSegundosRestantes] = useState(0);

  /*
    En refs y no en estado: el contador de inactividad no debe provocar
    re-renders, y sobre todo el efecto no puede depender de él. Si
    dependiera de `avisoVisible`, mostrar el aviso reiniciaría el efecto
    —y con él el contador—, así que la sesión no se cerraría nunca.
  */
  const ultimaActividad = useRef(0);
  const ultimaRenovacion = useRef(0);
  const avisoActivo = useRef(false);

  /*
    La renovación se dispara por actividad, no por un temporizador: si
    nadie está usando la aplicación, el token tiene que vencer.
  */
  const renovarSiHaceFalta = useCallback(async () => {
    const vence = vencimientoToken();
    const ahora = Date.now();

    if (!vence) return;
    if (vence - ahora > MARGEN_RENOVACION) return;
    if (ahora - ultimaRenovacion.current < ESPERA_ENTRE_RENOVACIONES) return;

    ultimaRenovacion.current = ahora;

    try {
      await renovarSesion();
    } catch {
      // Si el backend rechaza la renovación (cuenta desactivada, token
      // ya vencido), el interceptor de axios se encarga del 401.
    }
  }, [renovarSesion]);

  useEffect(() => {
    if (!usuario) return;

    // Solo la primera vez: si el efecto se rearma (por ejemplo tras una
    // renovación), no hay que perder el conteo acumulado.
    if (ultimaActividad.current === 0) {
      ultimaActividad.current = Date.now();
    }

    const registrarActividad = () => {
      // Con el aviso en pantalla la decisión pasa a ser explícita: se
      // sigue por el botón, no por seguir tocando la pantalla.
      if (avisoActivo.current) return;

      ultimaActividad.current = Date.now();
      renovarSiHaceFalta();
    };

    EVENTOS_DE_ACTIVIDAD.forEach((evento) =>
      window.addEventListener(evento, registrarActividad)
    );

    const revision = setInterval(() => {
      const inactivo = Date.now() - ultimaActividad.current;

      if (inactivo >= INACTIVIDAD_MAXIMA) {
        logout();
        return;
      }

      const faltan = INACTIVIDAD_MAXIMA - inactivo;

      avisoActivo.current = faltan <= AVISO_PREVIO;
      setAvisoVisible(avisoActivo.current);
      setSegundosRestantes(Math.ceil(faltan / 1000));
    }, 1000);

    return () => {
      EVENTOS_DE_ACTIVIDAD.forEach((evento) =>
        window.removeEventListener(evento, registrarActividad)
      );
      clearInterval(revision);
    };
  }, [usuario, logout, renovarSiHaceFalta]);

  const continuar = async () => {
    ultimaActividad.current = Date.now();
    ultimaRenovacion.current = 0; // fuerza la renovación del token
    avisoActivo.current = false;
    setAvisoVisible(false);
    await renovarSiHaceFalta();
  };

  if (!usuario) return null;

  return (
    <Dialog open={avisoVisible} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Tu sesión está por cerrarse</DialogTitle>
          <DialogDescription>
            Por seguridad, la sesión se cierra tras 10 minutos sin actividad.
            Se cerrará en {segundosRestantes} segundo
            {segundosRestantes === 1 ? "" : "s"}.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button variant="outline" onClick={logout}>
            Cerrar sesión
          </Button>
          <Button onClick={continuar}>Seguir trabajando</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
