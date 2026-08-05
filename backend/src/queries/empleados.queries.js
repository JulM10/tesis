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
    dni,
    fecha_nacimiento,
    telefono,
    direccion,
    notas,
    id_puesto,
    id_lugar,
    id_estado
  )
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
  RETURNING *;
`;

/*
  Rol con el que nace la cuenta de un empleado dado de alta.
  Se busca por nombre y no por id fijo: los id dependen del orden
  de inserción del seed y podrían no ser estables.
*/
export const GET_ROL_POR_NOMBRE = `
  SELECT id FROM roles WHERE nombre = $1
`;

export const UPDATE_EMPLEADO = `
  UPDATE empleados
  SET nombre           = COALESCE($1, nombre),
      apellido         = COALESCE($2, apellido),
      dni              = COALESCE($3, dni),
      fecha_nacimiento = COALESCE($4, fecha_nacimiento),
      telefono         = COALESCE($5, telefono),
      direccion        = COALESCE($6, direccion),
      notas            = COALESCE($7, notas),
      id_puesto        = COALESCE($8, id_puesto),
      id_lugar         = COALESCE($9, id_lugar),
      id_estado        = COALESCE($10, id_estado)
  WHERE id = $11
  RETURNING *
`;

export const DELETE_EMPLEADO = `
  DELETE FROM empleados WHERE id=$1
`;

/* =====================================================
   CV adjunto (binario en Postgres, tabla empleados_cv)
   ===================================================== */

export const EXISTE_EMPLEADO = `
  SELECT id FROM empleados WHERE id = $1
`;

// Descarga: es la ÚNICA query que lee la columna BYTEA
export const GET_CV = `
  SELECT nombre, mime, archivo
  FROM empleados_cv
  WHERE id_empleado = $1
`;

// Alta o reemplazo en una sola operación (upsert)
export const SET_CV = `
  INSERT INTO empleados_cv (id_empleado, nombre, mime, archivo)
  VALUES ($1, $2, $3, $4)
  ON CONFLICT (id_empleado) DO UPDATE
  SET nombre      = EXCLUDED.nombre,
      mime        = EXCLUDED.mime,
      archivo     = EXCLUDED.archivo,
      actualizado = CURRENT_TIMESTAMP
  RETURNING id_empleado AS id, nombre AS cv_nombre, actualizado AS cv_actualizado
`;

export const CLEAR_CV = `
  DELETE FROM empleados_cv
  WHERE id_empleado = $1
  RETURNING id_empleado AS id
`;
