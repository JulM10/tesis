import crypto from "crypto";
import { MENSAJES } from "../constantes/mensajes.js";

/*
  Autenticación del kiosco de asistencia (la PC de recepción).

  El kiosco se identifica como EQUIPO, no como persona: manda la clave
  de KIOSCO_CLAVE en el header X-Kiosco-Clave. No usa una sesión de
  usuario porque la sesión se cierra a los 10 minutos sin actividad, y
  la pantalla del kiosco tiene que quedar encendida todo el día sin que
  nadie la toque.

  Lo único que habilita la clave es VER el código del momento. No da
  acceso a ningún dato ni permite marcar asistencia: para eso cada
  empleado usa su propia sesión.
*/

// Se comparan los hashes y no las claves: timingSafeEqual exige el mismo
// largo, y así la comparación no revela el largo de la clave real.
const hash = (texto) => crypto.createHash("sha256").update(String(texto)).digest();

export const autenticarKiosco = (req, res, next) => {
  const claveConfigurada = process.env.KIOSCO_CLAVE;

  if (!claveConfigurada) {
    return res.status(503).json({ error: MENSAJES.ASISTENCIA.KIOSCO_NO_CONFIGURADO });
  }

  const recibida = req.get("X-Kiosco-Clave") ?? "";

  if (!crypto.timingSafeEqual(hash(recibida), hash(claveConfigurada))) {
    return res.status(401).json({ error: MENSAJES.ASISTENCIA.KIOSCO_CLAVE_INVALIDA });
  }

  next();
};
