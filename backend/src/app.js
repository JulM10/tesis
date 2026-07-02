import 'dotenv/config';
import express from "express";
import cors from "cors";
import empleadosRoutes from "./routes/empleados.routes.js";
import calendarioRoutes from "./routes/calendario.routes.js";
import horariosRoutes from "./routes/horarios.routes.js";
import authRoutes from "./routes/auth.routes.js";
import { autenticar } from "./middlewares/auth.middleware.js";


const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ message: "API Hotel Yacanto running 🚀" });
});

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});
// Público: login
app.use("/api/auth", authRoutes);

// Protegido: requiere JWT válido (los permisos se validan en cada ruta)
app.use("/api/calendario", autenticar, calendarioRoutes);
app.use("/api/empleados", autenticar, empleadosRoutes);
app.use("/api/horarios", autenticar, horariosRoutes);

// Middleware 404
app.use((req, res) => {
  res.status(404).json({ error: "Endpoint no encontrado" });
});

export default app;
