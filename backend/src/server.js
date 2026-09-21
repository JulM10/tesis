import 'dotenv/config';
import app from "./app.js";
import { connectDB } from "./config/database.js";
import { seedEmpleadosSiVacio } from "./database/seed-empleados.js";
import { archivarTurnosCompletados } from "./database/archivado.js";
import { sincronizarEstadoLicencias } from "./database/licencias.js";

const UNA_HORA = 60 * 60 * 1000;

// Turnos cerrados → historial inmutable, y estados según licencias de hoy.
// Ambas son idempotentes: correrlas de más no cambia nada.
const tareasPeriodicas = async () => {
  await archivarTurnosCompletados();
  await sincronizarEstadoLicencias();
};

const iniciar = async () => {
  await connectDB();

  // Los empleados de demo se cargan desde acá (no desde seed.sql)
  // porque sus datos personales van cifrados por la aplicación.
  await seedEmpleadosSiVacio();

  await tareasPeriodicas();

  setInterval(() => {
    tareasPeriodicas().catch((error) =>
      console.error("Tareas periódicas fallaron:", error.message)
    );
  }, UNA_HORA);

  const PORT = process.env.PORT || 3000;

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
};

iniciar().catch((error) => {
  console.error("El servidor no pudo iniciar:", error.message);
  process.exit(1);
});
