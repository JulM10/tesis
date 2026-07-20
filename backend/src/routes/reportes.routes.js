import { Router } from "express";
import * as reportesController from "../controllers/reportes.controllers.js";
import { requierePermiso } from "../middlewares/role.middleware.js";

const router = Router();

/**
 * GET /api/reportes/historial?desde&hasta&empleado&puesto
 * Historial de turnos (inmutable) con filtros opcionales combinables.
 */
router.get("/historial", requierePermiso("REPORTES_VER"), reportesController.getHistorial);

/**
 * GET /api/reportes/horas?desde&hasta
 * Turnos y horas trabajadas por empleado/puesto en el rango
 * (default: últimos 30 días). Usa fn_horas_trabajadas de la BD.
 */
router.get("/horas", requierePermiso("REPORTES_VER"), reportesController.getHorasTrabajadas);

/**
 * GET /api/reportes/dotacion
 * Cantidad de empleados por puesto y lugar de trabajo.
 */
router.get("/dotacion", requierePermiso("REPORTES_VER"), reportesController.getDotacion);

export default router;
