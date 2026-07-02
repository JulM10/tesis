export const GET_USUARIO_BY_EMAIL = `
SELECT id, email, password_hash, activo
FROM usuarios
WHERE email = $1;
`;

export const GET_PERMISOS_USUARIO = `
SELECT rol, permiso
FROM vw_usuarios_permisos
WHERE usuario_id = $1;
`;
