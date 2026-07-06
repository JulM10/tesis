export const GET_ALL_USUARIOS = `
SELECT
  u.id,
  u.email,
  u.activo,
  u.fecha_creacion_usuario,
  r.id       AS id_rol,
  r.nombre   AS rol,
  e.id       AS empleado_id,
  e.nombre   AS empleado_nombre,
  e.apellido AS empleado_apellido
FROM usuarios u
LEFT JOIN usuarios_roles ur ON ur.id_usuario = u.id
LEFT JOIN roles r ON r.id = ur.id_rol
LEFT JOIN empleados e ON e.id_usuario = u.id
ORDER BY u.id;
`;

export const CREATE_USUARIO = `
INSERT INTO usuarios (email, password_hash, activo)
VALUES ($1, $2, true)
RETURNING id, email, activo;
`;

export const ASIGNAR_ROL = `
INSERT INTO usuarios_roles (id_usuario, id_rol)
VALUES ($1, $2);
`;

export const QUITAR_ROLES = `
DELETE FROM usuarios_roles
WHERE id_usuario = $1;
`;

/*
  Vincula un empleado al usuario solo si el empleado no tiene
  usuario asociado (evita "robar" el vínculo de otro usuario).
*/
export const VINCULAR_EMPLEADO = `
UPDATE empleados
SET id_usuario = $1
WHERE id = $2
  AND id_usuario IS NULL
RETURNING id;
`;

export const UPDATE_USUARIO_ACTIVO = `
UPDATE usuarios
SET activo = $1
WHERE id = $2
RETURNING id, email, activo;
`;

export const DELETE_USUARIO = `
DELETE FROM usuarios
WHERE id = $1;
`;

export const GET_ROLES = `
SELECT id, nombre
FROM roles
ORDER BY id;
`;
