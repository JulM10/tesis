import { Router } from "express";
import * as horariosController from "../controllers/horarios.controllers.js";

const router = Router();

/**
 * GET /api/horarios/empleado/:id
 * Obtiene los horarios de un empleado por ID
 */
router.get("/empleado/:id", horariosController.getHorariosPorEmpleado);

/**
 * GET /api/horarios/dia/:fecha
 * Obtiene los horarios de un día específico
 */
router.get("/dia/:fecha", horariosController.horariosPorFecha);

/**
 * POST /api/horarios/asignar
 * Asigna un empleado a un turno del calendario
 */
router.post("/asignar/:id_empleado/:id_calendario", horariosController.asignarEmpleadoATurno);

/**
 * DELETE /api/horarios/:id
 * Elimina una asignación de horario por ID
 */
router.delete("/:id", horariosController.eliminarAsignacionHorario);

/**
 * GET /api/horarios/turno/:id
 * Obtiene los empleados asignados a un turno específico
 */
router.get("/turno/:id", horariosController.getEmpleadosAsignadosATurno); 


export default router;
