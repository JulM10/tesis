// Días corridos: en Postgres DATE - DATE devuelve un entero.
const COLUMNAS_LICENCIA = `
  id, tipo, fecha_desde, fecha_hasta,
  (fecha_hasta - fecha_desde + 1) AS dias,
  comentario, fecha_registro
`;

/*
  Lock de la fila del empleado: serializa las altas de licencias del
  mismo empleado, igual que LOCK_EMPLEADO en horarios. Sin esto, dos
  altas simultáneas podrían pasar las dos la validación de saldo.
*/
export const LOCK_EMPLEADO = `
  SELECT id, dias_vacaciones_anuales
  FROM empleados
  WHERE id = $1
  FOR UPDATE
`;

export const GET_DIAS_ANUALES = `
  SELECT dias_vacaciones_anuales FROM empleados WHERE id = $1
`;

export const GET_LICENCIAS = `
  SELECT ${COLUMNAS_LICENCIA}
  FROM licencias
  WHERE id_empleado = $1
  ORDER BY fecha_desde DESC
`;

// Año calendario en hora argentina (el servidor corre en UTC).
export const ANIO_ACTUAL = `
  SELECT EXTRACT(YEAR FROM (now() AT TIME ZONE 'America/Argentina/Cordoba'))::int AS anio
`;

/*
  Solo VACACIONES descuenta del saldo anual.

  Un período que cruza el 31/12 consume saldo de LOS DOS años, así que se
  cuentan únicamente los días que caen dentro del año pedido: el rango se
  recorta contra el 1/1 y el 31/12. Imputarlo entero al año de fecha_desde
  (como antes) dejaba el año nuevo sin descontar.
*/
export const DIAS_VACACIONES_USADOS = `
  SELECT COALESCE(SUM(
           LEAST(fecha_hasta, make_date($2::int, 12, 31))
           - GREATEST(fecha_desde, make_date($2::int, 1, 1)) + 1
         ), 0)::int AS usados
  FROM licencias
  WHERE id_empleado = $1
    AND tipo = 'VACACIONES'
    AND fecha_desde <= make_date($2::int, 12, 31)
    AND fecha_hasta >= make_date($2::int, 1, 1)
`;

export const LICENCIA_SUPERPUESTA = `
  SELECT 1
  FROM licencias
  WHERE id_empleado = $1
    AND fecha_desde <= $3
    AND fecha_hasta >= $2
  LIMIT 1
`;

export const TURNOS_EN_RANGO = `
  SELECT to_char(c.fecha, 'DD/MM') AS fecha
  FROM asignacion_horario ah
  JOIN calendario c ON c.id = ah.id_calendario
  WHERE ah.id_empleado = $1
    AND c.fecha BETWEEN $2 AND $3
  ORDER BY c.fecha, c.hora_inicio
`;

/*
  Turnos del rango donde el empleado YA fichó. No impide cargar la licencia:
  sirve para avisarle a RRHH qué días trabajó igual, porque esos turnos
  conservan sus horas en vez de contarse como día de licencia.
*/
export const TURNOS_CON_ASISTENCIA_EN_RANGO = `
  SELECT to_char(c.fecha, 'DD/MM') AS fecha
  FROM asignacion_horario ah
  JOIN calendario c ON c.id = ah.id_calendario
  WHERE ah.id_empleado = $1
    AND c.fecha BETWEEN $2 AND $3
    AND ah.hora_ingreso IS NOT NULL
  ORDER BY c.fecha, c.hora_inicio
`;

export const INSERT_LICENCIA = `
  INSERT INTO licencias (id_empleado, tipo, fecha_desde, fecha_hasta, comentario, id_usuario_registra)
  VALUES ($1, $2, $3, $4, $5, $6)
  RETURNING ${COLUMNAS_LICENCIA}
`;

export const DELETE_LICENCIA = `
  DELETE FROM licencias
  WHERE id = $1
    AND id_empleado = $2
  RETURNING id
`;
