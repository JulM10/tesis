/**
 * Tipos de licencia, con la etiqueta y el color que los identifican.
 * Los valores son los del CHECK de la tabla licencias en el schema.
 *
 * Solo VACACIONES descuenta del saldo anual; VACACIONES y ENFERMEDAD
 * además cambian el estado del empleado mientras duran.
 */
export const TIPOS_LICENCIA = {
  VACACIONES: { etiqueta: "Vacaciones", color: "bg-blue-100 text-blue-800" },
  ENFERMEDAD: { etiqueta: "Enfermedad", color: "bg-yellow-100 text-yellow-800" },
  ESPECIAL: { etiqueta: "Especial", color: "bg-purple-100 text-purple-800" },
};
