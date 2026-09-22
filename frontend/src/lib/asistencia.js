import { soloFecha } from "@/lib/fechas";

/**
 * Estado de asistencia de un turno, en vivo.
 *
 * Mientras el turno no pasó al historial, el estado se deriva de las marcas
 * con las mismas reglas que usa archivar_turnos_completados en la base: así
 * lo que se ve en el calendario coincide con lo que queda después en los
 * reportes. Los turnos no cruzan la medianoche y están en hora argentina.
 */

/*
  Las claves son las de la base (estado_asistencia del historial) más los
  dos estados que solo existen en vivo (PENDIENTE y EN_CURSO).
  `clase` es la etiqueta de color; `punto`, el color del punto del reporte.
*/
export const ESTADOS_ASISTENCIA = {
  PENDIENTE: { etiqueta: "Pendiente", clase: "bg-gray-100 text-gray-600", punto: "bg-gray-400" },
  EN_CURSO: { etiqueta: "En curso", clase: "bg-sky-100 text-sky-700", punto: "bg-sky-500" },
  PRESENTE: { etiqueta: "Asistió", clase: "bg-emerald-100 text-emerald-700", punto: "bg-emerald-500" },
  INCOMPLETO: { etiqueta: "Sin salida", clase: "bg-amber-100 text-amber-800", punto: "bg-amber-500" },
  AUSENTE: { etiqueta: "No asistió", clase: "bg-red-100 text-red-700", punto: "bg-red-500" },
  ENFERMEDAD: { etiqueta: "Enfermedad", clase: "bg-violet-100 text-violet-700", punto: "bg-violet-500" },
  LICENCIA: { etiqueta: "Licencia", clase: "bg-indigo-100 text-indigo-700", punto: "bg-indigo-500" },
};

/*
  Turnos archivados antes de que existiera el control de asistencia:
  estado_asistencia es NULL y no hay forma de saber si asistieron.
*/
export const SIN_CONTROL = { etiqueta: "Sin control", clase: "bg-gray-100 text-gray-500", punto: "bg-gray-300" };

/** Estados que puede tener un turno ya archivado, en el orden del reporte. */
export const ESTADOS_HISTORIAL = ["PRESENTE", "INCOMPLETO", "AUSENTE", "ENFERMEDAD", "LICENCIA"];

// Mismo margen que el backend para marcar la salida después del fin.
const MARGEN_EGRESO_MIN = 60;

const aMinutos = (hora) => {
  const [h, m] = String(hora).split(":").map(Number);
  return h * 60 + m;
};

/**
 * Fecha y minuto actuales en Argentina, sin importar la zona horaria de la
 * computadora. Se llama desde efectos o manejadores, no durante el render.
 */
export const ahoraArgentina = () => {
  const partes = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Argentina/Cordoba",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(new Date())
      .map((p) => [p.type, p.value])
  );

  return {
    fecha: `${partes.year}-${partes.month}-${partes.day}`,
    minutos: Number(partes.hour) * 60 + Number(partes.minute),
  };
};

/**
 * @param turno  fila de vw_horarios_empleado (fecha, hora_inicio, hora_fin,
 *               hora_ingreso, hora_egreso, licencia)
 * @param ahora  resultado de ahoraArgentina()
 * @returns      clave de ESTADOS_ASISTENCIA
 */
export const estadoAsistencia = (turno, ahora) => {
  if (turno.licencia === "ENFERMEDAD") return "ENFERMEDAD";
  if (turno.licencia) return "LICENCIA";
  if (turno.hora_egreso) return "PRESENTE";

  const fecha = soloFecha(turno.fecha);
  const esPasado = fecha < ahora.fecha;
  const esHoy = fecha === ahora.fecha;

  if (turno.hora_ingreso) {
    const cerroElMargen =
      esPasado ||
      (esHoy && ahora.minutos > aMinutos(turno.hora_fin) + MARGEN_EGRESO_MIN);
    return cerroElMargen ? "INCOMPLETO" : "EN_CURSO";
  }

  const terminoElTurno =
    esPasado || (esHoy && ahora.minutos > aMinutos(turno.hora_fin));
  return terminoElTurno ? "AUSENTE" : "PENDIENTE";
};

/** RRHH puede corregir marcas de turnos de hoy o anteriores, sin archivar y sin licencia. */
export const esCorregible = (turno, ahora) =>
  soloFecha(turno.fecha) <= ahora.fecha && !turno.archivado && !turno.licencia;
