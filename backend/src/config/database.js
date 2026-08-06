// backend/src/config/database.js
import pkg from "pg";
const { Pool, types } = pkg;

// DATE (OID 1082) se devuelve como string "YYYY-MM-DD" en lugar de
// Date de JS: evita el corrimiento de un día por conversión a UTC
// cuando el cliente está en otra zona horaria (ej. UTC-3).
types.setTypeParser(1082, (valor) => valor);

// Dos formas de configurar la conexión:
// - DATABASE_URL: la que entregan los Postgres gestionados (Render, Neon, Railway).
// - Variables sueltas: el entorno local (Docker Compose / npm run dev).
export const pool = new Pool(
  process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
        // El proveedor gestionado exige TLS. rejectUnauthorized: false acepta
        // su certificado sin validar la cadena: cifra el canal, no verifica al par.
        ssl: { rejectUnauthorized: false },
      }
    : {
        user: process.env.DB_USER,
        host: process.env.DB_HOST,
        database: process.env.DB_NAME,
        password: process.env.DB_PASSWORD,
        port: process.env.DB_PORT,
      }
);

export const connectDB = async () => {
  try {
    await pool.query("SELECT 1"); // prueba rápida
    console.log("PostgreSQL connected successfully");
  } catch (error) {
    console.error("PostgreSQL connection error:", error.message);
    process.exit(1);
  }
};
