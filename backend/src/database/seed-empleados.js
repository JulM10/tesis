import bcrypt from "bcryptjs";
import { pool } from "../config/database.js";
import { cifrar } from "../utils/cifrado.js";
import { generarPasswordInicial } from "../utils/passwordInicial.js";

/*
  Seed de empleados con datos personales CIFRADOS.

  No puede vivir en seed.sql: el cifrado AES-256-GCM ocurre en la
  aplicación, así que los datos deben pasar por utils/cifrado.js antes
  del INSERT. Se ejecuta al arrancar el backend y es idempotente:
  si la tabla ya tiene filas, no hace nada — el flujo
  "docker compose down -v && up" sigue funcionando sin pasos extra.

  Cada empleado nace con su cuenta de acceso, igual que en el alta real
  por API: si el email ya existe (usuarios demo de seed.sql) se reutiliza
  esa cuenta; si no, se crea una con la password derivada de sus datos
  (Nombre + Apellido + últimos 4 del DNI) y debe_cambiar_password = true.

  Las asignaciones de horario y las licencias también van acá (FK a
  empleados, y el comentario de la licencia va cifrado).
*/

// [nombre, apellido, dni, fecha_nacimiento, telefono, direccion, id_puesto, id_lugar, id_estado, fecha_creacion, email]
const EMPLEADOS = [
  ["Juan", "Pérez", "24856301", "1996-03-10", "3544550482", "Calle Principal 123", 2, 1, 1, "2020-05-10T10:30:00Z", "empleado@hotel.com"],
  ["Ana", "Gómez", "26104387", "1998-07-15", "3511234567", "Av. Siempre Viva 742", 4, 5, 1, "2022-06-15T14:20:00Z", "empleado2@hotel.com"],
  ["Carlos", "Ruiz", "14239076", "1981-05-22", "3419876543", "Ruta 9 Km 12", 3, 1, 2, "2021-11-20T09:45:00Z", "inactivo@hotel.com"],
  ["Lucía", "Fernández", "30518642", "2004-09-08", "3515558899", "Pasaje Norte 55", 2, 1, 1, "2023-01-30T11:15:00Z", "lucia.fernandez@hotel.com"],
  ["Diego", "López", "19472085", "1989-12-05", "3541234567", "Calle 5 #45", 1, 2, 1, "2019-08-22T08:00:00Z", "diego.lopez@hotel.com"],
  ["María", "García", "26893514", "1999-03-18", "3542345678", "Calle 10 #67", 2, 3, 1, "2021-02-14T09:30:00Z", "maria.garcia@hotel.com"],
  ["Roberto", "Martínez", "14708259", "1982-07-30", "3543456789", "Calle 15 #89", 3, 1, 1, "2018-11-05T10:15:00Z", "roberto.martinez@hotel.com"],
  ["Patricia", "Rodríguez", "22615930", "1993-09-12", "3544567890", "Calle 20 #123", 4, 5, 1, "2020-03-20T11:45:00Z", "patricia.rodriguez@hotel.com"],
  ["Francisco", "Sánchez", "17384621", "1986-01-25", "3545678901", "Calle 25 #145", 1, 4, 1, "2019-06-18T13:20:00Z", "francisco.sanchez@hotel.com"],
  ["Elena", "Torres", "25470198", "1997-05-08", "3546789012", "Calle 30 #167", 2, 2, 1, "2022-01-10T14:50:00Z", "elena.torres@hotel.com"],
  ["José", "Jiménez", "13925740", "1980-11-14", "3547890123", "Calle 35 #189", 5, 3, 1, "2017-09-28T15:30:00Z", "jose.jimenez@hotel.com"],
  ["Isabel", "Vargas", "27306485", "2000-08-20", "3548901234", "Calle 40 #201", 4, 1, 1, "2023-05-12T16:00:00Z", "isabel.vargas@hotel.com"],
  ["Miguel", "Castro", "20851463", "1991-04-03", "3549012345", "Calle 45 #223", 1, 5, 1, "2021-07-08T08:30:00Z", "miguel.castro@hotel.com"],
  ["Carmen", "Moreno", "16097352", "1984-10-16", "3550123456", "Calle 50 #245", 3, 2, 1, "2019-04-25T09:45:00Z", "carmen.moreno@hotel.com"],
  ["Antonio", "Díaz", "18542706", "1988-02-27", "3551234567", "Calle 55 #267", 2, 4, 1, "2020-12-01T10:20:00Z", "antonio.diaz@hotel.com"],
  ["Rosa", "Fernández", "28173954", "2001-06-09", "3552345678", "Calle 60 #289", 5, 3, 1, "2023-03-14T11:15:00Z", "rosa.fernandez@hotel.com"],
  ["Luis", "Ramos", "15630827", "1983-08-11", "3553456789", "Calle 65 #301", 1, 1, 1, "2018-10-19T12:30:00Z", "luis.ramos@hotel.com"],
  ["Laura", "Navarro", "23064719", "1994-12-24", "3554567890", "Calle 70 #323", 4, 5, 1, "2021-05-07T13:45:00Z", "laura.navarro@hotel.com"],
  ["Javier", "Cortés", "17925368", "1987-03-15", "3555678901", "Calle 75 #345", 2, 2, 1, "2020-08-30T14:20:00Z", "javier.cortes@hotel.com"],
  ["Sofía", "Herrera", "26437081", "1998-09-02", "3556789012", "Calle 80 #367", 3, 4, 1, "2022-02-18T15:50:00Z", "sofia.herrera@hotel.com"],
];

const ESTADO_ACTIVO = 1;

/*
  Personas por turno según el puesto del turno (id_puesto → cantidad).
  Invariante: turnos diarios del puesto × personas ≤ activos del puesto.
  Con eso la rotación nunca repite a alguien en el mismo día, y no hay
  solapamientos. Si se agregan turnos en seed.sql, revisar esta cuenta.
*/
const PERSONAS_POR_TURNO = { 1: 1, 2: 2, 3: 2, 4: 3, 5: 1 };

/*
  Licencias de demo. Días relativos al lunes de ESTA semana, igual que
  el calendario de seed.sql:
  - Laura, de vacaciones toda esta semana: la sincronización de estados
    la pasa a "Vacaciones" al arrancar.
  - Diego, enfermo martes y miércoles de la semana pasada, SOBRE turnos
    que ya tenía asignados: en el historial figuran como Enfermedad, no
    como ausencia.
  - Elena, vacaciones dentro de tres semanas: muestra el saldo descontado.
*/
// [posición en EMPLEADOS (1..20), tipo, día desde, día hasta, comentario]
const LICENCIAS = [
  [18, "VACACIONES", 0, 6, "Vacaciones acordadas con el encargado de mucamas"],
  [5, "ENFERMEDAD", -6, -5, "Presentó certificado médico: gastroenteritis, reposo 48 h"],
  [10, "VACACIONES", 21, 30, null],
];

const insertarLicencias = async (client, idsInsertados) => {
  const insertadas = [];

  for (const [posicion, tipo, desde, hasta, comentario] of LICENCIAS) {
    const result = await client.query(
      `INSERT INTO licencias (id_empleado, tipo, fecha_desde, fecha_hasta, comentario)
       VALUES ($1, $2,
               (date_trunc('week', CURRENT_DATE) + $3 * INTERVAL '1 day')::date,
               (date_trunc('week', CURRENT_DATE) + $4 * INTERVAL '1 day')::date,
               $5)
       RETURNING id_empleado, tipo, fecha_desde, fecha_hasta`,
      [idsInsertados[posicion - 1], tipo, desde, hasta, cifrar(comentario)]
    );
    insertadas.push(result.rows[0]);
  }

  return insertadas;
};

const sumarMinutos = (hora, minutos) => {
  const [h, m] = hora.split(":").map(Number);
  const total = h * 60 + m + minutos;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
};

/*
  Marcas de asistencia simuladas para turnos ya pasados, con un patrón
  determinístico: la mayoría llega unos minutos antes, algunos llegan
  tarde, alguno falta y alguno se olvida de marcar el egreso.
*/
const marcasSimuladas = (turno, n) => {
  if (n % 17 === 0) return [null, null];
  if (n % 23 === 5) return [sumarMinutos(turno.hora_inicio, -4), null];
  if (n % 7 === 3) return [sumarMinutos(turno.hora_inicio, 18), sumarMinutos(turno.hora_fin, 2)];
  return [sumarMinutos(turno.hora_inicio, -(n % 9)), sumarMinutos(turno.hora_fin, n % 6)];
};

const cubiertoPor = (licencias, idEmpleado, fecha, tipos) =>
  licencias.some(
    (l) =>
      l.id_empleado === idEmpleado &&
      tipos.includes(l.tipo) &&
      fecha >= l.fecha_desde &&
      fecha <= l.fecha_hasta
  );

/*
  Reparte los turnos de calendario (creados por seed.sql con fechas
  relativas) entre los empleados activos de cada puesto, por rotación.
  No usa ids de calendario fijos: los turnos cambian según la fecha en
  que se creó la base. Nadie recibe turnos durante sus vacaciones; la
  enfermedad no se saltea porque llega después de armado el calendario.
*/
const asignarTurnos = async (client, idsInsertados, licencias) => {
  const plantel = {};
  EMPLEADOS.forEach(([, , , , , , puesto, , estado], i) => {
    if (estado !== ESTADO_ACTIVO) return;
    (plantel[puesto] ??= []).push(idsInsertados[i]);
  });

  const { rows: turnos } = await client.query(
    `SELECT id, id_puesto, fecha, hora_inicio, hora_fin
     FROM calendario
     ORDER BY fecha, hora_inicio, id_puesto`
  );

  // Fecha argentina: el servidor corre en UTC.
  const hoy = new Date().toLocaleDateString("en-CA", { timeZone: "America/Argentina/Cordoba" });

  const proximo = {};
  let total = 0;
  let pasados = 0;

  for (const turno of turnos) {
    const grupo = plantel[turno.id_puesto] ?? [];
    const cupo = Math.min(PERSONAS_POR_TURNO[turno.id_puesto] ?? 1, grupo.length);

    for (let k = 0; k < cupo; k++) {
      // Avanza la rotación salteando a quien esté de vacaciones ese día.
      let idEmpleado = null;
      for (let intento = 0; intento < grupo.length && idEmpleado === null; intento++) {
        const posicion = proximo[turno.id_puesto] ?? 0;
        proximo[turno.id_puesto] = posicion + 1;
        const candidato = grupo[posicion % grupo.length];
        if (!cubiertoPor(licencias, candidato, turno.fecha, ["VACACIONES"])) {
          idEmpleado = candidato;
        }
      }
      if (idEmpleado === null) continue;

      let marcas = [null, null];
      if (turno.fecha < hoy && !cubiertoPor(licencias, idEmpleado, turno.fecha, ["ENFERMEDAD", "ESPECIAL"])) {
        marcas = marcasSimuladas(turno, pasados++);
      }

      await client.query(
        `INSERT INTO asignacion_horario (id_empleado, id_calendario, hora_ingreso, hora_egreso)
         VALUES ($1, $2, $3, $4)`,
        [idEmpleado, turno.id, ...marcas]
      );
      total++;
    }
  }

  return total;
};

/*
  Devuelve el id del usuario para ese email: reutiliza el existente
  (usuarios demo) o crea uno nuevo con la password inicial derivada.
*/
const obtenerOCrearUsuario = async (client, { nombre, apellido, dni, email }) => {
  const existente = await client.query("SELECT id FROM usuarios WHERE email = $1", [email]);

  if (existente.rows[0]) {
    return { id: existente.rows[0].id, creado: false };
  }

  const passwordHash = await bcrypt.hash(generarPasswordInicial(nombre, apellido, dni), 10);

  const usuario = await client.query(
    "INSERT INTO usuarios (email, password_hash) VALUES ($1, $2) RETURNING id",
    [email, passwordHash]
  );

  await client.query(
    `INSERT INTO usuarios_roles (id_usuario, id_rol)
     SELECT $1, id FROM roles WHERE nombre = 'EMPLEADO'`,
    [usuario.rows[0].id]
  );

  return { id: usuario.rows[0].id, creado: true };
};

export const seedEmpleadosSiVacio = async () => {
  const { rows } = await pool.query("SELECT COUNT(*)::int AS total FROM empleados");

  if (rows[0].total > 0) {
    return; // Ya hay datos: no se re-siembra
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const idsInsertados = [];
    let cuentasCreadas = 0;

    for (const [nombre, apellido, dni, fnac, tel, dir, puesto, lugar, estado, creacion, email] of EMPLEADOS) {
      const usuario = await obtenerOCrearUsuario(client, { nombre, apellido, dni, email });
      if (usuario.creado) cuentasCreadas++;

      const result = await client.query(
        `INSERT INTO empleados
           (id_usuario, nombre, apellido, dni, fecha_nacimiento, telefono, direccion,
            id_puesto, id_lugar, id_estado, fecha_creacion)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING id`,
        [usuario.id, nombre, apellido, cifrar(dni), cifrar(fnac), cifrar(tel), cifrar(dir),
         puesto, lugar, estado, creacion]
      );
      idsInsertados.push(result.rows[0].id);
    }

    const licencias = await insertarLicencias(client, idsInsertados);
    const asignaciones = await asignarTurnos(client, idsInsertados, licencias);

    await client.query("COMMIT");
    console.log(
      `Seed: ${idsInsertados.length} empleados insertados con datos personales cifrados ` +
      `(${cuentasCreadas} cuentas de acceso nuevas con password inicial), ` +
      `${licencias.length} licencias y ${asignaciones} asignaciones de turno`
    );
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Seed de empleados falló:", error.message);
    throw error;
  } finally {
    client.release();
  }
};
