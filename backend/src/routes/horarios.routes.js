import { Router } from "express";
import * as horariosController from "../controllers/horarios.controllers.js";
import { requierePermiso } from "../middlewares/role.middleware.js";

const router = Router();

/**
 * GET /api/horarios/empleado/:id
 * Obtiene los horarios de un empleado por ID
 */
router.get("/empleado/:id", requierePermiso("CALENDARIO_VER"), horariosController.getHorariosPorEmpleado);

/**
 * GET /api/horarios
 * Obtiene todos los horarios
*/
router.get("/", requierePermiso("CALENDARIO_VER"), horariosController.getAllHorarios);

/**
 * GET /api/horarios/dia/:fecha
 * Obtiene los horarios de un día específico
 */
router.get("/dia/:fecha", requierePermiso("CALENDARIO_VER"), horariosController.horariosPorFecha);

/**
 * POST /api/horarios/asignar
 * Asigna un empleado a un turno del calendario
 */
router.post("/asignar/", requierePermiso("CALENDARIO_CREAR"), horariosController.asignarEmpleadoATurno);

/**
 * DELETE /api/horarios/asignar/:id_empleado/:id_calendario
 * Elimina la asignación de un empleado a un turno
 */
router.delete("/asignar/:id_empleado/:id_calendario", requierePermiso("CALENDARIO_ELIMINAR"), horariosController.eliminarAsignacionHorario);

/**
 * GET /api/horarios/turno/:id
 * Obtiene los empleados asignados a un turno específico
 */
router.get("/turno/:id", requierePermiso("CALENDARIO_VER"), horariosController.getEmpleadosAsignadosATurno);


export default router;
