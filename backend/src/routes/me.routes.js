import { Router } from "express";
import * as meController from "../controllers/me.controllers.js";
import { subirCV } from "../middlewares/subirCV.middleware.js";

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

/**
 * POST /api/me/cv
 * Sube o reemplaza el CV propio (form-data, campo "cv", PDF/DOCX, máx 5MB)
 */
router.post("/cv", subirCV, meController.subirMiCV);

/**
 * GET /api/me/cv
 * Descarga el CV propio
 */
router.get("/cv", meController.descargarMiCV);

export default router;
