import { COLOR_ESTADO } from "@/lib/empleados";

/**
 * Etiqueta de color con el estado laboral del empleado.
 * Vive acá y no en la página de empleados porque también lo usa el
 * buscador del calendario, para que RRHH vea a quién está por asignar.
 */
export default function EstadoEmpleado({ estado }) {
  if (!estado) {
    return <span className="text-gray-400">—</span>;
  }

  return (
    <span
      className={`inline-flex rounded-full px-2 py-1 text-xs font-medium whitespace-nowrap ${
        COLOR_ESTADO[estado] ?? "bg-gray-100 text-gray-600"
      }`}
    >
      {estado}
    </span>
  );
}
