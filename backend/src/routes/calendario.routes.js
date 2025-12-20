import { Router } from "express";
import * as calendarioController from "../controllers/calendario.controllers.js";

const router = Router();

/**
 * GET /api/horarios
 * Obtiene el listado de horarios
 */
router.get("/", calendarioController.getCalendarios);

/**
 * GET /api/horarios/:id
 * Obtiene un horario por ID
 */
router.get("/:id",calendarioController.getCalendarioById);

/**     
 * POST /api/horarios
 * Crea un nuevo horario
 */
router.post("/", calendarioController.createCalendario);

/** 
 * PUT /api/horarios/:id
 * Actualiza un horario por ID
 */
router.put("/:id", calendarioController.updateCalendario);

/**
 * DELETE /api/horarios/:id
 * Elimina un horario por ID
 */
router.delete("/:id", calendarioController.deleteCalendario);

/**
 * GET /api/horarios/fecha/:fecha
 * Obtiene los horarios por fecha
 */
router.get("/fecha/:fecha", calendarioController.LeerHorariosPorFecha);

/**
 * GET /api/horarios/fecha/:fecha/puesto/:id_puesto
 * Obtiene los horarios por fecha y puesto
 */
router.get("/fecha/:fecha/puesto/:id_puesto", calendarioController.LeerHorariosPorFechaYPuesto);

export default router;