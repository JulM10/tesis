// backend/src/config/database.js
import pkg from "pg";
const { Pool, types } = pkg;

// DATE (OID 1082) se devuelve como string "YYYY-MM-DD" en lugar de
// Date de JS: evita el corrimiento de un día por conversión a UTC
// cuando el cliente está en otra zona horaria (ej. UTC-3).
types.setTypeParser(1082, (valor) => valor);

export const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

export const connectDB = async () => {
  try {
    await pool.query("SELECT 1"); // prueba rápida
    console.log("PostgreSQL connected successfully");
  } catch (error) {
    console.error("PostgreSQL connection error:", error.message);
    process.exit(1);
  }
};
