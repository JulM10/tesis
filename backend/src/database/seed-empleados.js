import { pool } from "../config/database.js";
import { cifrar } from "../utils/cifrado.js";

/*
  Seed de empleados con datos personales CIFRADOS.

  No puede vivir en seed.sql: el cifrado AES-256-GCM ocurre en la
  aplicación, así que los datos deben pasar por utils/cifrado.js antes
  del INSERT. Se ejecuta al arrancar el backend y es idempotente:
  si la tabla ya tiene filas, no hace nada — el flujo
  "docker compose down -v && up" sigue funcionando sin pasos extra.

  Las asignaciones de horario también van acá (FK a empleados).
*/

// [nombre, apellido, fecha_nacimiento, telefono, direccion, id_puesto, id_lugar, id_estado, fecha_creacion, email_usuario]
const EMPLEADOS = [
  ["Juan", "Pérez", "1996-03-10", "3544550482", "Calle Principal 123", 2, 1, 1, "2020-05-10T10:30:00Z", "empleado@hotel.com"],
  ["Ana", "Gómez", "1998-07-15", "3511234567", "Av. Siempre Viva 742", 4, 5, 1, "2022-06-15T14:20:00Z", "empleado2@hotel.com"],
  ["Carlos", "Ruiz", "1981-05-22", "3419876543", "Ruta 9 Km 12", 3, 1, 2, "2021-11-20T09:45:00Z", "inactivo@hotel.com"],
  ["Lucía", "Fernández", "2004-09-08", "3515558899", "Pasaje Norte 55", 2, 1, 1, "2023-01-30T11:15:00Z", null],
  ["Diego", "López", "1989-12-05", "3541234567", "Calle 5 #45", 1, 2, 1, "2019-08-22T08:00:00Z", null],
  ["María", "García", "1999-03-18", "3542345678", "Calle 10 #67", 2, 3, 1, "2021-02-14T09:30:00Z", null],
  ["Roberto", "Martínez", "1982-07-30", "3543456789", "Calle 15 #89", 3, 1, 1, "2018-11-05T10:15:00Z", null],
  ["Patricia", "Rodríguez", "1993-09-12", "3544567890", "Calle 20 #123", 4, 5, 1, "2020-03-20T11:45:00Z", null],
  ["Francisco", "Sánchez", "1986-01-25", "3545678901", "Calle 25 #145", 1, 4, 1, "2019-06-18T13:20:00Z", null],
  ["Elena", "Torres", "1997-05-08", "3546789012", "Calle 30 #167", 2, 2, 1, "2022-01-10T14:50:00Z", null],
  ["José", "Jiménez", "1980-11-14", "3547890123", "Calle 35 #189", 5, 3, 1, "2017-09-28T15:30:00Z", null],
  ["Isabel", "Vargas", "2000-08-20", "3548901234", "Calle 40 #201", 4, 1, 1, "2023-05-12T16:00:00Z", null],
  ["Miguel", "Castro", "1991-04-03", "3549012345", "Calle 45 #223", 1, 5, 1, "2021-07-08T08:30:00Z", null],
  ["Carmen", "Moreno", "1984-10-16", "3550123456", "Calle 50 #245", 3, 2, 1, "2019-04-25T09:45:00Z", null],
  ["Antonio", "Díaz", "1988-02-27", "3551234567", "Calle 55 #267", 2, 4, 1, "2020-12-01T10:20:00Z", null],
  ["Rosa", "Fernández", "2001-06-09", "3552345678", "Calle 60 #289", 5, 3, 1, "2023-03-14T11:15:00Z", null],
  ["Luis", "Ramos", "1983-08-11", "3553456789", "Calle 65 #301", 1, 1, 1, "2018-10-19T12:30:00Z", null],
  ["Laura", "Navarro", "1994-12-24", "3554567890", "Calle 70 #323", 4, 5, 1, "2021-05-07T13:45:00Z", null],
  ["Javier", "Cortés", "1987-03-15", "3555678901", "Calle 75 #345", 2, 2, 1, "2020-08-30T14:20:00Z", null],
  ["Sofía", "Herrera", "1998-09-02", "3556789012", "Calle 80 #367", 3, 4, 1, "2022-02-18T15:50:00Z", null],
];

// [id_empleado (posición 1..20 en EMPLEADOS), id_calendario]
const ASIGNACIONES = [
  // Lunes 15/07
  [1, 1], [2, 1], [3, 2], [4, 2], [5, 3], [6, 3], [7, 4], [8, 4],
  [9, 5], [10, 6], [11, 6], [12, 7], [13, 7],
  // Martes 16/07
  [14, 8], [5, 8], [15, 9], [6, 9], [1, 10], [16, 11], [2, 11],
  // Miércoles 17/07
  [3, 12], [4, 12], [7, 13], [8, 13], [17, 14], [9, 14], [10, 15], [11, 15],
  // Jueves 18/07
  [12, 16], [13, 16], [15, 17], [6, 17], [18, 18], [1, 18], [14, 19], [2, 19],
  // Viernes 19/07
  [5, 20], [16, 20], [7, 21], [8, 21], [19, 22], [3, 23], [20, 23],
  // Sábado 20/07
  [9, 24], [4, 24], [15, 25], [6, 25], [10, 26], [11, 26], [12, 27], [13, 27],
  // Domingo 21/07
  [1, 28], [14, 28], [5, 29], [6, 29], [17, 30], [18, 30], [2, 31], [16, 31],
];

export const seedEmpleadosSiVacio = async () => {
  const { rows } = await pool.query("SELECT COUNT(*)::int AS total FROM empleados");

  if (rows[0].total > 0) {
    return; // Ya hay datos: no se re-siembra
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const idsInsertados = [];

    for (const [nombre, apellido, fnac, tel, dir, puesto, lugar, estado, creacion, email] of EMPLEADOS) {
      const result = await client.query(
        `INSERT INTO empleados
           (id_usuario, nombre, apellido, fecha_nacimiento, telefono, direccion,
            id_puesto, id_lugar, id_estado, fecha_creacion)
         VALUES (
           (SELECT id FROM usuarios WHERE email = $1),
           $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING id`,
        [email, nombre, apellido, cifrar(fnac), cifrar(tel), cifrar(dir), puesto, lugar, estado, creacion]
      );
      idsInsertados.push(result.rows[0].id);
    }

    for (const [posicionEmpleado, idCalendario] of ASIGNACIONES) {
      await client.query(
        "INSERT INTO asignacion_horario (id_empleado, id_calendario) VALUES ($1, $2)",
        [idsInsertados[posicionEmpleado - 1], idCalendario]
      );
    }

    await client.query("COMMIT");
    console.log(`Seed: ${idsInsertados.length} empleados insertados con datos personales cifrados`);
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Seed de empleados falló:", error.message);
    throw error;
  } finally {
    client.release();
  }
};
