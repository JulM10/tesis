import { TIPOS_LICENCIA } from "@/lib/licencias";

/**
 * Etiqueta de color con el tipo de licencia. La usan la ficha del empleado
 * y el reporte de licencias, así que vive acá y no dentro de una pantalla.
 */
export default function TipoLicencia({ tipo }) {
  const info = TIPOS_LICENCIA[tipo];

  if (!info) {
    return <span className="text-gray-400">—</span>;
  }

  return (
    <span
      className={`inline-flex rounded px-2 py-0.5 text-xs font-medium whitespace-nowrap ${info.color}`}
    >
      {info.etiqueta}
    </span>
  );
}
