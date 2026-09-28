/**
 * Estado laboral del empleado: Activo, Inactivo, Vacaciones, Enfermo,
 * Suspendido o Despedido (tabla estados del schema).
 *
 * Vacaciones y Enfermo los maneja el backend solo, a partir de las
 * licencias vigentes hoy; los otros los pone RRHH a mano.
 */
export const COLOR_ESTADO = {
  Activo: "bg-emerald-100 text-emerald-800",
  Inactivo: "bg-gray-100 text-gray-600",
  Vacaciones: "bg-blue-100 text-blue-800",
  Enfermo: "bg-yellow-100 text-yellow-800",
  Suspendido: "bg-orange-100 text-orange-800",
  Despedido: "bg-red-100 text-red-800",
};

/**
 * Un estado distinto de Activo no impide asignar el turno: el estado no
 * tiene fechas, así que no puede decidir sobre un turno de la semana que
 * viene (las licencias, que sí las tienen, las valida el backend). Pero es
 * lo que hay que mirar antes de elegir, así que en el buscador se muestra
 * solo cuando no es Activo, que es el caso normal y sería ruido.
 */
export const necesitaAtencion = (estado) => Boolean(estado) && estado !== "Activo";
