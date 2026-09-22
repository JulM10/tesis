/**
 * Colores de los puestos en el calendario.
 * La paleta son sugerencias para elegir rápido: el puesto acepta cualquier
 * color #rrggbb (lo valida el backend).
 */
export const PALETA_PUESTOS = [
  "#2563eb", // azul
  "#ea580c", // naranja
  "#db2777", // rosa
  "#7c3aed", // violeta
  "#059669", // verde
  "#0891b2", // cian
  "#ca8a04", // ámbar
  "#64748b", // gris pizarra
  "#dc2626", // rojo
  "#4f46e5", // índigo
];

// Para turnos sin puesto o puestos todavía sin color.
export const COLOR_NEUTRO = "#9ca3af";

/** Mismo color con transparencia (#rrggbbaa), para fondos y bordes suaves. */
export const tinte = (color, alfaHex) => `${color ?? COLOR_NEUTRO}${alfaHex}`;
