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

// Solo VACACIONES descuenta del saldo; se imputa al año de fecha_desde.
export const DIAS_VACACIONES_USADOS = `
  SELECT COALESCE(SUM(fecha_hasta - fecha_desde + 1), 0)::int AS usados
  FROM licencias
  WHERE id_empleado = $1
    AND tipo = 'VACACIONES'
    AND EXTRACT(YEAR FROM fecha_desde) = $2
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

export const INSERT_LICENCIA = `
  INSERT INTO licencias (id_empleado, tipo, fecha_desde, fecha_hasta, comentario)
  VALUES ($1, $2, $3, $4, $5)
  RETURNING ${COLUMNAS_LICENCIA}
`;

export const DELETE_LICENCIA = `
  DELETE FROM licencias
  WHERE id = $1
    AND id_empleado = $2
  RETURNING id
`;
