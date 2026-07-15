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
    notas,
    id_puesto,
    id_lugar,
    id_estado
  )
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
  RETURNING *;
`;



export const UPDATE_EMPLEADO = `
  UPDATE empleados
  SET nombre    = COALESCE($1, nombre),
      apellido  = COALESCE($2, apellido),
      edad      = COALESCE($3, edad),
      telefono  = COALESCE($4, telefono),
      direccion = COALESCE($5, direccion),
      notas     = COALESCE($6, notas),
      id_puesto = COALESCE($7, id_puesto),
      id_lugar  = COALESCE($8, id_lugar),
      id_estado = COALESCE($9, id_estado)
  WHERE id = $10
  RETURNING *
`;

export const DELETE_EMPLEADO = `
  DELETE FROM empleados WHERE id=$1
`;

export const GET_CV = `
  SELECT cv_ruta, cv_nombre, cv_mime
  FROM empleados
  WHERE id = $1
`;

export const SET_CV = `
  UPDATE empleados
  SET cv_ruta = $1,
      cv_nombre = $2,
      cv_mime = $3,
      cv_actualizado = CURRENT_TIMESTAMP
  WHERE id = $4
  RETURNING id, cv_nombre, cv_actualizado
`;

export const CLEAR_CV = `
  UPDATE empleados
  SET cv_ruta = NULL,
      cv_nombre = NULL,
      cv_mime = NULL,
      cv_actualizado = NULL
  WHERE id = $1
  RETURNING id
`;
