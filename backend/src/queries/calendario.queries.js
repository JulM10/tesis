export const CrearCalendario = `
INSERT INTO calendario (fecha, hora_inicio, hora_fin, id_puesto)
VALUES ($1, $2, $3, $4)
RETURNING *;
`;

export const GETObtenerCalendario = `
SELECT *
FROM calendario
ORDER BY fecha, hora_inicio;
`;

export const GETObtenerCalendarioPorId = `
SELECT *
FROM calendario
WHERE id = $1;
`;

export const GETLeerHorariosPorFecha = `
SELECT *
FROM calendario
WHERE fecha = $1
ORDER BY hora_inicio;
`;

export const GETLeerHorariosPorFechaYPuesto = `
SELECT *
FROM calendario
WHERE fecha = $1
AND id_puesto = $2
ORDER BY hora_inicio;
`;

export const PUTActualizarCalendario = `
UPDATE calendario
SET fecha = $1,
    hora_inicio = $2,
    hora_fin = $3,
    id_puesto = $4
WHERE id = $5
RETURNING *;
`;

export const DELETEEliminarCalendario = `
DELETE FROM calendario
WHERE id = $1;
`;
