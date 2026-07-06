import { Router } from "express";
import * as meController from "../controllers/me.controllers.js";

const router = Router();

/*
  Rutas de autogestión: solo requieren sesión (autenticar se aplica
  en app.js). Cada usuario accede únicamente a SU información,
  resuelta desde el id del token — nunca desde parámetros.
*/

/**
 * GET /api/me
 * Sesión actual + empleado vinculado (o null)
 */
router.get("/", meController.getMe);

/**
 * GET /api/me/horarios
 * Turnos asignados del empleado vinculado
 */
router.get("/horarios", meController.getMisHorarios);

/**
 * PUT /api/me
 * Actualiza datos propios: { telefono?, direccion?, notas? }
 */
router.put("/", meController.updateMisDatos);

export default router;
