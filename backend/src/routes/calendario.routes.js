import { Router } from "express";

const router = Router();

/**
 * GET /api/horarios
 * Obtiene el listado de horarios
 */
router.get("/", (req, res) => {
  res.json({ status: "ok" });
});

/**
 * GET /api/horarios/:id
 * Obtiene un horario por ID
 */
router.get("/:id", (req, res) => {
  const { id } = req.params;
  res.json({ id, descripcion: "Horario Ejemplo" });
});

/**     
 * POST /api/horarios
 * Crea un nuevo horario
 */
router.post("/", (req, res) => {
    const nuevoHorario = req.body;
    res.status(201).json({ message: "Horario creado", horario: nuevoHorario });
});

/** 
 * PUT /api/horarios/:id
 * Actualiza un horario por ID
 */
router.put("/:id", (req, res) => {
  const { id } = req.params;
  const datosActualizados = req.body;
  res.json({ message: "Horario actualizado", id, datos: datosActualizados });
});

/**
 * DELETE /api/horarios/:id
 * Elimina un horario por ID
 */
router.delete("/:id", (req, res) => {
  const { id } = req.params;
  res.json({ message: "Horario eliminado", id });
});



export default router;