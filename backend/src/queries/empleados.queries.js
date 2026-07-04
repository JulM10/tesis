export const GET_ALL_EMPLEADOS = `
  SELECT * FROM empleados ORDER BY id
`;

export const GET_EMPLEADOS_DETALLE = `
  SELECT * FROM vw_empleados_detalle ORDER BY empleado_id
`;

export const GET_EMPLEADO_BY_ID = `
  SELECT * FROM empleados WHERE id = $1
`;

export const CREATE_EMPLEADO = `
  INSERT INTO empleados (
    id_usuario,
    nombre,
    apellido,
    edad,
    telefono,
    direccion,
    id_puesto,
    id_lugar,
    id_estado
  )
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
  RETURNING *;
`;



export const UPDATE_EMPLEADO = `
  UPDATE empleados
  SET nombre    = COALESCE($1, nombre),
      apellido  = COALESCE($2, apellido),
      edad      = COALESCE($3, edad),
      telefono  = COALESCE($4, telefono),
      direccion = COALESCE($5, direccion),
      id_puesto = COALESCE($6, id_puesto),
      id_lugar  = COALESCE($7, id_lugar),
      id_estado = COALESCE($8, id_estado)
  WHERE id = $9
  RETURNING *
`;

export const DELETE_EMPLEADO = `
  DELETE FROM empleados WHERE id=$1
`;
