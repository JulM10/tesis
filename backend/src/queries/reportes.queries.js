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
    hora_fin,
    estado_asistencia,
    hora_ingreso,
    hora_egreso,
    horas_trabajadas
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

/*
  Dotación por puesto en un período (gráfico del dashboard).
  Sale de los turnos planificados (calendario + asignaciones) y no del
  historial: "esta semana" y "este mes" incluyen días que todavía no
  pasaron, y el historial solo tiene turnos cerrados.
  El puesto es el DEL TURNO (qué rol se cubrió), no el del empleado.
  LEFT JOIN desde puestos: un puesto sin turnos en el período aparece
  con 0, que también es información.
*/
export const GET_DOTACION_PERIODO = `
  SELECT
    p.nombre AS puesto,
    p.color,
    COUNT(DISTINCT ah.id_empleado) AS empleados,
    COUNT(DISTINCT c.id) AS turnos,
    COUNT(ah.id) AS asignaciones
  FROM puestos p
  LEFT JOIN calendario c
    ON c.id_puesto = p.id
   AND c.fecha BETWEEN $1::date AND $2::date
  LEFT JOIN asignacion_horario ah ON ah.id_calendario = c.id
  GROUP BY p.id, p.nombre, p.color
  ORDER BY empleados DESC, p.nombre
`;

export const GET_DOTACION = `
  SELECT puesto, lugar_trabajo, cantidad_empleados
  FROM vw_reporte_empleados_puesto_lugar
  ORDER BY puesto, lugar_trabajo
`;
