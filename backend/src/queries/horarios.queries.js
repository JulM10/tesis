export const POSTAsignarHorario = `
INSERT INTO asignacion_horario (id_empleado, id_calendario)
VALUES ($1, $2)
RETURNING *;
`;

export const todosHorarios = `
SELECT fecha, hora_inicio, hora_fin
FROM calendario
WHERE id = $1;
`;

export const VALIDAR_SOLAPAMIENTO_HORARIO = `
  SELECT 1
  FROM asignacion_horario ah
  JOIN calendario c ON c.id = ah.id_calendario
  WHERE ah.id_empleado = $1
    AND c.fecha = $2
    AND ($3 < c.hora_fin AND $4 > c.hora_inicio)
  LIMIT 1
`;

export const GETHorariosPorEmpleado = `
SELECT *
FROM vw_horarios_empleado
WHERE empleado_id = $1
ORDER BY fecha, hora_inicio;
`;

export const GETHorariosEmpleados = `
SELECT *
FROM vw_horarios_empleado
ORDER BY fecha, hora_inicio;
`;

export const GETEmpleadosAsignadosATurno = `
SELECT
  e.id,
  e.nombre,
  e.apellido
FROM asignacion_horario ah
JOIN empleados e ON e.id = ah.id_empleado
WHERE ah.id_calendario = $1;
`;

export const DELETEAsignacionHorario = `
DELETE FROM asignacion_horario
WHERE id_empleado = $1
  AND id_calendario = $2;
`;

export const SelectValidacionHorarios = `
SELECT 1
FROM asignacion_horario ah
JOIN calendario c ON c.id = ah.id_calendario
JOIN calendario c_new ON c_new.id = $2
WHERE ah.id_empleado = $1
  AND c.fecha = c_new.fecha
  AND (
    c.hora_inicio < c_new.hora_fin
    AND c.hora_fin > c_new.hora_inicio
  );
`;

export const GEThorariosPorFecha = `
SELECT *
FROM vw_horarios_empleado
WHERE fecha = $1
ORDER BY hora_inicio;
`;

export const POSTHistorialHorarios = `
INSERT INTO asignacion_horario_historial (
  empleado_nombre,
  empleado_apellido,
  puesto,
  lugar_trabajo,
  fecha,
  hora_inicio,
  hora_fin
)
SELECT
  e.nombre,
  e.apellido,
  p.nombre,
  l.nombre,
  c.fecha,
  c.hora_inicio,
  c.hora_fin
FROM empleados e
JOIN puestos p ON p.id = e.id_puesto
JOIN lugares_trabajo l ON l.id = e.id_lugar
JOIN calendario c ON c.id = $1
WHERE e.id = $2;
`;

export const GET_CALENDARIO_POR_ID = `
SELECT *
FROM calendario
WHERE id = $1;
`;
