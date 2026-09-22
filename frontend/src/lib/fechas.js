/**
 * Utilidades de fecha sobre strings "YYYY-MM-DD".
 * Se evita new Date("YYYY-MM-DD") porque se parsea como medianoche UTC
 * y en Argentina (UTC-3) corre la fecha un día hacia atrás.
 */

const aDate = (iso) => {
  const [anio, mes, dia] = soloFecha(iso).split("-").map(Number);
  return new Date(anio, mes - 1, dia); // constructor local, sin UTC
};

const aISO = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

/** Descarta la parte horaria si viene un timestamp ISO */
export const soloFecha = (iso) => String(iso).split("T")[0];

export const hoyISO = () => aISO(new Date());

/** Lunes de la semana a la que pertenece la fecha */
export const lunesDeSemana = (iso) => {
  const d = aDate(iso);
  const dia = d.getDay(); // 0 = domingo
  d.setDate(d.getDate() + (dia === 0 ? -6 : 1 - dia));
  return aISO(d);
};

export const sumarDias = (iso, dias) => {
  const d = aDate(iso);
  d.setDate(d.getDate() + dias);
  return aISO(d);
};

/** Primer día del mes de la fecha: "2025-11-20" → "2025-11-01" */
export const inicioDeMes = (iso) => `${soloFecha(iso).slice(0, 7)}-01`;

/** Último día del mes de la fecha: "2025-02-10" → "2025-02-28" */
export const finDeMes = (iso) => {
  const d = aDate(iso);
  return aISO(new Date(d.getFullYear(), d.getMonth() + 1, 0)); // día 0 = último del mes anterior
};

/** Mismo día N meses después (o antes); se usa sobre el día 1 para no desbordar */
export const sumarMeses = (iso, meses) => {
  const d = aDate(iso);
  return aISO(new Date(d.getFullYear(), d.getMonth() + meses, d.getDate()));
};

/** "2025-11-20" → "20/11/2025" */
export const formatearFecha = (iso) => {
  const [anio, mes, dia] = soloFecha(iso).split("-");
  return `${dia}/${mes}/${anio}`;
};

/** "08:00:00" → "08:00" */
export const horaCorta = (hora) => (hora ? String(hora).slice(0, 5) : "");

export const NOMBRES_DIAS = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
  "Domingo",
];
