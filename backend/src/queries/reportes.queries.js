/*
  Reportes: lecturas sobre el historial inmutable y las vistas/función
  de la BD. Los filtros opcionales usan el patrón "$n IS NULL OR ...":
  SQL estático 100% parametrizado, sin armar strings dinámicos.
*/

export const GET_HISTORIAL = `
  SELECT
    empleado_nombre,
    empleado_apellido,
    puesto,
    lugar_trabajo,
    fecha,
    hora_inicio,
    hora_fin
  FROM vw_reporte_historial_horarios
  WHERE ($1::date IS NULL OR fecha >= $1)
    AND ($2::date IS NULL OR fecha <= $2)
    AND ($3::text IS NULL
         OR (empleado_nombre || ' ' || empleado_apellido) ILIKE '%' || $3 || '%')
    AND ($4::text IS NULL OR puesto = $4)
  ORDER BY fecha DESC, hora_inicio
`;

export const GET_HORAS_TRABAJADAS = `
  SELECT * FROM fn_horas_trabajadas($1, $2)
`;

export const GET_DOTACION = `
  SELECT puesto, lugar_trabajo, cantidad_empleados
  FROM vw_reporte_empleados_puesto_lugar
  ORDER BY puesto, lugar_trabajo
`;
