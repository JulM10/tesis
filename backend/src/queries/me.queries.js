export const GET_MI_EMPLEADO = `
SELECT *
FROM vw_empleados_detalle
WHERE usuario_id = $1;
`;

export const GET_MIS_HORARIOS = `
SELECT *
FROM vw_horarios_empleado
WHERE empleado_id = $1
ORDER BY fecha, hora_inicio;
`;

/*
  Autogestión (Ley 25.326): el empleado solo puede rectificar sus
  datos de contacto y su descripción, nunca puesto/lugar/estado.
*/
export const UPDATE_MIS_DATOS = `
UPDATE empleados
SET telefono  = COALESCE($1, telefono),
    direccion = COALESCE($2, direccion),
    notas     = COALESCE($3, notas)
WHERE id_usuario = $4
RETURNING *;
`;
