/*
  ABM de la estructura del hotel: puestos y lugares de trabajo.

  Las queries están escritas una por entidad en lugar de armar el nombre
  de la tabla en tiempo de ejecución: así ninguna consulta del proyecto
  concatena SQL, ni siquiera con valores de una lista blanca.
*/

/* ---------- PUESTOS ---------- */

export const CREAR_PUESTO = `
INSERT INTO puestos (nombre)
VALUES ($1)
RETURNING id, nombre;
`;

export const EDITAR_PUESTO = `
UPDATE puestos
SET nombre = $1
WHERE id = $2
RETURNING id, nombre;
`;

export const ELIMINAR_PUESTO = `
DELETE FROM puestos
WHERE id = $1
RETURNING id;
`;

// El puesto se referencia desde empleados y desde los turnos del calendario.
export const CONTAR_USO_PUESTO = `
SELECT
  (SELECT COUNT(*) FROM empleados  WHERE id_puesto = $1)::int AS empleados,
  (SELECT COUNT(*) FROM calendario WHERE id_puesto = $1)::int AS turnos;
`;

/* ---------- LUGARES DE TRABAJO ---------- */

export const CREAR_LUGAR = `
INSERT INTO lugares_trabajo (nombre)
VALUES ($1)
RETURNING id, nombre;
`;

export const EDITAR_LUGAR = `
UPDATE lugares_trabajo
SET nombre = $1
WHERE id = $2
RETURNING id, nombre;
`;

export const ELIMINAR_LUGAR = `
DELETE FROM lugares_trabajo
WHERE id = $1
RETURNING id;
`;

// El lugar solo lo referencian los empleados (el calendario no lo usa).
export const CONTAR_USO_LUGAR = `
SELECT
  (SELECT COUNT(*) FROM empleados WHERE id_lugar = $1)::int AS empleados,
  0::int AS turnos;
`;
