import dotenv from "dotenv";
import app from "./app.js";
import { connectDB } from "./config/database.js";
import { seedEmpleadosSiVacio } from "./database/seed-empleados.js";

dotenv.config();

const iniciar = async () => {
  await connectDB();

  // Los empleados de demo se cargan desde acá (no desde seed.sql)
  // porque sus datos personales van cifrados por la aplicación.
  await seedEmpleadosSiVacio();

  const PORT = process.env.PORT || 3000;

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
};

iniciar().catch((error) => {
  console.error("El servidor no pudo iniciar:", error.message);
  process.exit(1);
});
