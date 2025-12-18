import express from "express";
import cors from "cors";
import empleadosRoutes from "./routes/empleados.routes.js";
import calendarioRoutes from "./routes/calendario.routes.js";
import horariosRoutes from "./routes/horarios.routes.js";


const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ message: "API Hotel Yacanto running 🚀" });
});

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});
app.use("/api/calendario", calendarioRoutes);
app.use("/api/empleados", empleadosRoutes);
app.use("/api/horarios", horariosRoutes);

// Middleware 404
app.use((req, res) => {
  res.status(404).json({ error: "Endpoint no encontrado" });
});

export default app;
