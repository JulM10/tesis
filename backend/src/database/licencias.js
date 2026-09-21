import { pool } from "../config/database.js";

/*
  Alinea el estado de cada empleado con sus licencias vigentes hoy
  (procedimiento sincronizar_estado_licencias). Se ejecuta al arrancar,
  cada hora, y dentro de la transacción que crea o borra una licencia
  (por eso acepta un client).
*/
export const sincronizarEstadoLicencias = async (client = pool) => {
  const result = await client.query("CALL sincronizar_estado_licencias($1)", [null]);
  return result.rows[0]?.actualizados ?? 0;
};
