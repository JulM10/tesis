export const GET_ALL_EMPLEADOS = `
  SELECT * FROM empleados ORDER BY id
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
  SET nombre=$1, apellido=$2, edad=$3, id_puesto=$4, id_lugar=$5
  WHERE id=$6
  RETURNING *
`;

export const DELETE_EMPLEADO = `
  DELETE FROM empleados WHERE id=$1
`;
