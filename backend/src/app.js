import express from "express";
import cors from "cors";
import empleadosRoutes from "./routes/empleados.routes.js";
import calendarioRoutes from "./routes/calendario.routes.js";
import horariosRoutes from "./routes/horarios.routes.js";
import authRoutes from "./routes/auth.routes.js";
import catalogosRoutes from "./routes/catalogos.routes.js";
import usuariosRoutes from "./routes/usuarios.routes.js";
import meRoutes from "./routes/me.routes.js";
import reportesRoutes from "./routes/reportes.routes.js";
import establecimientoRoutes from "./routes/establecimiento.routes.js";
import { autenticar } from "./middlewares/auth.middleware.js";


const app = express();

// Solo los orígenes declarados pueden consumir la API. En local basta el
// dev server de Vite; en producción se lista el dominio del frontend.
const origenesPermitidos = (process.env.CORS_ORIGIN || "http://localhost:5173")
  .split(",")
  .map((origen) => origen.trim())
  .filter(Boolean);

app.use(cors({ origin: origenesPermitidos }));
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
app.use("/api/catalogos", autenticar, catalogosRoutes);
app.use("/api/usuarios", autenticar, usuariosRoutes);
app.use("/api/me", autenticar, meRoutes);
app.use("/api/reportes", autenticar, reportesRoutes);
app.use("/api/establecimiento", autenticar, establecimientoRoutes);

// Middleware 404
app.use((req, res) => {
  res.status(404).json({ error: "Endpoint no encontrado" });
});

export default app;
