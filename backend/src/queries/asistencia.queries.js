/*
  Control de asistencia. El servidor corre en UTC y los turnos están en
  hora argentina: "ahora" y "hoy" siempre se piden a Postgres con la zona
  horaria explícita, nunca con el reloj del proceso.
*/

export const AHORA_LOCAL = `
SELECT to_char(ts, 'YYYY-MM-DD') AS fecha,
       to_char(ts, 'HH24:MI:SS') AS hora
FROM (SELECT now() AT TIME ZONE 'America/Argentina/Cordoba' AS ts) t;
`;

export const LICENCIA_EN_FECHA = `
SELECT 1
FROM licencias
WHERE id_empleado = $1
  AND $2::date BETWEEN fecha_desde AND fecha_hasta
LIMIT 1;
`;

/*
  Turnos del empleado en la fecha, bloqueados hasta el COMMIT: si llegan
  dos marcas a la vez (doble toque, dos pestañas), la segunda espera y ve
  la primera ya guardada.
*/
export const TURNOS_DEL_DIA = `
SELECT ah.id,
       c.hora_inicio,
       c.hora_fin,
       ah.hora_ingreso,
       ah.hora_egreso,
       p.nombre AS puesto
FROM asignacion_horario ah
JOIN calendario c ON c.id = ah.id_calendario
LEFT JOIN puestos p ON p.id = c.id_puesto
WHERE ah.id_empleado = $1
  AND c.fecha = $2::date
ORDER BY c.hora_inicio
FOR UPDATE OF ah;
`;

export const REGISTRAR_INGRESO = `
UPDATE asignacion_horario
SET hora_ingreso = $2
WHERE id = $1
  AND hora_ingreso IS NULL;
`;

export const REGISTRAR_EGRESO = `
UPDATE asignacion_horario
SET hora_egreso = $2
WHERE id = $1
  AND hora_egreso IS NULL;
`;

/* Corrección de RRHH: datos de la asignación para validar antes de tocarla */
export const ASIGNACION_PARA_CORREGIR = `
SELECT ah.id,
       ah.archivado,
       c.fecha > (now() AT TIME ZONE 'America/Argentina/Cordoba')::date AS futuro,
       EXISTS (
         SELECT 1
         FROM licencias li
         WHERE li.id_empleado = ah.id_empleado
           AND c.fecha BETWEEN li.fecha_desde AND li.fecha_hasta
       ) AS con_licencia
FROM asignacion_horario ah
JOIN calendario c ON c.id = ah.id_calendario
WHERE ah.id_empleado = $1
  AND ah.id_calendario = $2
FOR UPDATE OF ah;
`;

export const CORREGIR_ASISTENCIA = `
UPDATE asignacion_horario
SET hora_ingreso = $2,
    hora_egreso  = $3
WHERE id = $1
RETURNING id_empleado, id_calendario, hora_ingreso, hora_egreso;
`;
