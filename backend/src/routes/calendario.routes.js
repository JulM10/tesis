import { Router } from "express";
import * as calendarioController from "../controllers/calendario.controllers.js";
import { requierePermiso } from "../middlewares/role.middleware.js";
import { validarCalendario } from "../middlewares/validarCalendario.middleware.js";

const router = Router();

/**
 * GET /api/calendario
 * Obtiene el listado de horarios
 */
router.get("/", requierePermiso("CALENDARIO_VER"), calendarioController.getCalendarios);

/**
 * GET /api/calendario/:id
 * Obtiene un horario por ID
 */
router.get("/:id", requierePermiso("CALENDARIO_VER"), calendarioController.getCalendarioById);

/**
 * POST /api/calendario
 * Crea un nuevo horario
 */
router.post("/", requierePermiso("CALENDARIO_CREAR"), validarCalendario, calendarioController.createCalendario);

/**
 * PUT /api/calendario/:id
 * Actualiza un horario por ID
 */
router.put("/:id", requierePermiso("CALENDARIO_EDITAR"), validarCalendario, calendarioController.updateCalendario);

/**
 * DELETE /api/calendario/:id
 * Elimina un horario por ID
 */
router.delete("/:id", requierePermiso("CALENDARIO_ELIMINAR"), calendarioController.deleteCalendario);

/**
 * GET /api/calendario/fecha/:fecha
 * Obtiene los horarios por fecha
 */
router.get("/fecha/:fecha", requierePermiso("CALENDARIO_VER"), calendarioController.LeerHorariosPorFecha);

/**
 * GET /api/calendario/fecha/:fecha/puesto/:id_puesto
 * Obtiene los horarios por fecha y puesto
 */
router.get("/fecha/:fecha/puesto/:id_puesto", requierePermiso("CALENDARIO_VER"), calendarioController.LeerHorariosPorFechaYPuesto);

export default router;
