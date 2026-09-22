import { ESTADOS_ASISTENCIA, SIN_CONTROL } from "@/lib/asistencia";

/** Etiqueta de color con el estado de asistencia de un turno. */
export default function EstadoAsistencia({ estado, className = "" }) {
  const info = ESTADOS_ASISTENCIA[estado];

  if (!info) {
    return <span className="text-gray-400">—</span>;
  }

  return (
    <span
      className={`inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-medium leading-none whitespace-nowrap ${info.clase} ${className}`}
    >
      {info.etiqueta}
    </span>
  );
}

/**
 * Punto de color + texto, para listados largos como el historial: se lee
 * de un vistazo qué días asistió (verde) y cuáles no (rojo).
 * Sin estado (turnos anteriores al control de asistencia): "Sin control".
 * Con `cantidad`, sirve de total para un resumen ("● 12 Asistió").
 */
export function PuntoAsistencia({ estado, cantidad }) {
  const info = ESTADOS_ASISTENCIA[estado] ?? SIN_CONTROL;

  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${info.punto}`} aria-hidden="true" />
      {cantidad !== undefined && <strong className="font-semibold text-gray-800">{cantidad}</strong>}
      {info.etiqueta}
    </span>
  );
}
