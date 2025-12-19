import 'dotenv/config';
import { pool } from "./config/database.js";

const testConnection = async () => {
  try {
    const res = await pool.query("SELECT NOW()");
    console.log("Conexión OK:", res.rows);
  } catch (error) {
    console.error("Error de conexión:", error.message);
  } finally {
    pool.end(); // cierra la conexión
  }
}

testConnection();