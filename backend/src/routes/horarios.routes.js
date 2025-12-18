import { Router } from "express";

const router = Router();

/**
 * GET /api/horarios/empleado/:id
 * Obtiene los horarios de un empleado por ID
 */
router.get("/empleado/:id", (req, res) => {
  res.json({ status: "ok" });
});

/**
 * GET /api/horarios/dia/:fecha
 * Obtiene los horarios de un día específico
 */
router.get("/dia/:fecha", (req, res) => {
  res.json({ status: "ok" });
});

/**
 * GET /api/horarios/:id
 * Obtiene una asignación de horario por ID
 */
router.get("/:id", (req, res) => {
  res.json({ status: "ok" });
});

/**
 * POST /api/horarios/asignar
 * Asigna un empleado a un turno del calendario
 */
router.post("/asignar", (req, res) => {
  res.status(201).json({ status: "ok" });
});

/**
 * DELETE /api/horarios/:id
 * Elimina una asignación de horario por ID
 */
router.delete("/:id", (req, res) => {
  res.json({ status: "ok" });
});

export default router;
