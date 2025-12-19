import { Router } from 'express';
import * as empleadosController from "../controllers/empleados.controllers.js";

const router = Router();

/**
 * GET /api/empleados
 * Obtiene el listado de empleados
 */
router.get("/", empleadosController.getEmpleados);
/**
 * GET /api/empleados/:id
 * Obtiene un empleado por ID
 */
router.get("/:id", empleadosController.getEmpleadoById);

/**
 * POST /api/empleados
 * Crea un nuevo empleado
*/
router.post("/", empleadosController.createEmpleado);

/**
 * PUT /api/empleados/:id
 * Actualiza un empleado por ID
 */
router.put('/:id',empleadosController.updateEmpleado);

/**
 * DELETE /api/empleados/:id
 * Elimina un empleado por ID
 */
router.delete('/:id',empleadosController.deleteEmpleado);


export default router;