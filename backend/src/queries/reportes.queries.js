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
    AND ($5::text IS NULL OR estado_asistencia = $5)
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

/*
  Licencias tomadas en el período (reporte histórico).

  Solapamiento y no contención: una licencia que empezó en febrero y
  terminó en marzo aparece al pedir marzo. Es lo que espera quien pregunta
  "qué licencias hubo este mes".

  Sin el comentario, a propósito: va cifrado y puede tener el diagnóstico
  (Ley 25.326 art. 7). Dejarlo afuera mantiene el reporte 100% resuelto en
  SQL, igual que los otros tres, y evita que un dato de salud termine en
  una planilla exportada. Se sigue viendo en la ficha del empleado.

  El filtro por nombre normaliza las tildes en las dos puntas, igual que
  BUSCAR_EMPLEADOS: "gomez" encuentra a "Gómez".
*/
export const GET_LICENCIAS_PERIODO = `
  SELECT
    e.nombre   AS empleado_nombre,
    e.apellido AS empleado_apellido,
    p.nombre   AS puesto,
    l.tipo,
    l.fecha_desde,
    l.fecha_hasta,
    (l.fecha_hasta - l.fecha_desde + 1) AS dias,
    l.fecha_registro,
    u.email AS registrada_por
  FROM licencias l
  JOIN empleados e ON e.id = l.id_empleado
  LEFT JOIN puestos p ON p.id = e.id_puesto
  LEFT JOIN usuarios u ON u.id = l.id_usuario_registra
  WHERE ($1::date IS NULL OR l.fecha_hasta >= $1)
    AND ($2::date IS NULL OR l.fecha_desde <= $2)
    AND ($3::text IS NULL
         OR translate(e.nombre || ' ' || e.apellido, 'áéíóúüñÁÉÍÓÚÜÑ', 'aeiouunAEIOUUN')
            ILIKE '%' || translate($3::text, 'áéíóúüñÁÉÍÓÚÜÑ', 'aeiouunAEIOUUN') || '%'
         OR translate(e.apellido || ' ' || e.nombre, 'áéíóúüñÁÉÍÓÚÜÑ', 'aeiouunAEIOUUN')
            ILIKE '%' || translate($3::text, 'áéíóúüñÁÉÍÓÚÜÑ', 'aeiouunAEIOUUN') || '%')
    AND ($4::text IS NULL OR p.nombre = $4)
    AND ($5::text IS NULL OR l.tipo = $5)
  ORDER BY l.fecha_desde DESC, e.apellido, e.nombre
`;

/*
  Saldo de vacaciones de TODOS los empleados en un año.

  Misma fórmula que DIAS_VACACIONES_USADOS: se cuentan solo los días que
  caen dentro del año, recortando el rango contra el 1/1 y el 31/12, para
  que un período que cruza el 31/12 descuente de los dos años.

  LEFT JOIN: el empleado que no se tomó un solo día también tiene que
  aparecer — es justamente a quien busca este reporte. Por eso además se
  ordena por días disponibles.
*/
export const GET_SALDO_VACACIONES = `
  WITH tomados AS (
    SELECT
      e.id,
      /*
        El FILTER no es opcional: LEAST y GREATEST IGNORAN los NULL, así que
        para un empleado sin vacaciones (LEFT JOIN sin fila) el recorte daba
        31/12 - 1/1 + 1 = 365 días tomados. Se suman solo las filas reales.
      */
      COALESCE(SUM(
        LEAST(l.fecha_hasta, make_date($1::int, 12, 31))
        - GREATEST(l.fecha_desde, make_date($1::int, 1, 1)) + 1
      ) FILTER (WHERE l.id IS NOT NULL), 0)::int AS usados
    FROM empleados e
    LEFT JOIN licencias l
      ON l.id_empleado = e.id
     AND l.tipo = 'VACACIONES'
     AND l.fecha_desde <= make_date($1::int, 12, 31)
     AND l.fecha_hasta >= make_date($1::int, 1, 1)
    GROUP BY e.id
  )
  SELECT
    e.nombre   AS empleado_nombre,
    e.apellido AS empleado_apellido,
    p.nombre   AS puesto,
    e.dias_vacaciones_anuales AS anuales,
    t.usados,
    GREATEST(0, e.dias_vacaciones_anuales - t.usados)::int AS disponibles
  FROM empleados e
  JOIN tomados t ON t.id = e.id
  LEFT JOIN puestos p ON p.id = e.id_puesto
  ORDER BY disponibles DESC, e.apellido, e.nombre
`;

export const GET_DOTACION = `
  SELECT puesto, lugar_trabajo, cantidad_empleados
  FROM vw_reporte_empleados_puesto_lugar
  ORDER BY puesto, lugar_trabajo
`;
