export const GET_PUESTOS = `
SELECT id, nombre, color
FROM puestos
ORDER BY nombre;
`;

export const GET_LUGARES = `
SELECT id, nombre
FROM lugares_trabajo
ORDER BY nombre;
`;

export const GET_ESTADOS = `
SELECT id, nombre
FROM estados
ORDER BY id;
`;
