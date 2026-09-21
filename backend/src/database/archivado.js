import { pool } from "../config/database.js";

/*
  Archivado automático del historial de turnos.

  Invoca el procedimiento almacenado archivar_turnos_completados():
  copia al historial inmutable los turnos ya cerrados, con su resultado
  de asistencia, y los marca como archivados (idempotente — correrlo dos
  veces no duplica).

  Se ejecuta al arrancar el backend y cada hora (server.js): para la
  escala del hotel no hace falta un cron externo.
*/
export const archivarTurnosCompletados = async () => {
  const result = await pool.query("CALL archivar_turnos_completados($1)", [null]);
  const archivados = result.rows[0]?.archivados ?? 0;

  if (archivados > 0) {
    console.log(`Historial: ${archivados} turnos completados archivados`);
  }

  return archivados;
};
