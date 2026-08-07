export const GET_USUARIO_BY_EMAIL = `
SELECT id, email, password_hash, activo, debe_cambiar_password
FROM usuarios
WHERE email = $1;
`;

export const GET_USUARIO_BY_ID = `
SELECT id, email, password_hash, activo, debe_cambiar_password
FROM usuarios
WHERE id = $1;
`;

/*
  Rotación de credencial: además del hash nuevo, baja el flag.
  Van juntos en el mismo UPDATE para que no pueda quedar una password
  cambiada con el flag todavía en true (o viceversa).
*/
export const UPDATE_PASSWORD = `
UPDATE usuarios
SET password_hash = $1,
    debe_cambiar_password = FALSE
WHERE id = $2
RETURNING id, email;
`;

export const GET_PERMISOS_USUARIO = `
SELECT rol, permiso
FROM vw_usuarios_permisos
WHERE usuario_id = $1;
`;
