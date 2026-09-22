import { ESTADOS_ASISTENCIA } from "@/lib/asistencia";

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
