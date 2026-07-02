import { Router } from 'express';
import * as empleadosController from "../controllers/empleados.controllers.js";
import { validarEmpleado } from '../middlewares/validarEmpleado.middleware.js';
import { requierePermiso } from '../middlewares/role.middleware.js';

const router = Router();

/**
 * GET /api/empleados
 * Obtiene el listado de empleados
 */
router.get("/", requierePermiso("EMPLEADOS_VER"), empleadosController.getEmpleados);
/**
 * GET /api/empleados/:id
 * Obtiene un empleado por ID
 */
router.get("/:id", requierePermiso("EMPLEADOS_VER"), empleadosController.getEmpleadoById);

/**
 * POST /api/empleados
 * Crea un nuevo empleado
*/
router.post(
  '/',
  requierePermiso("EMPLEADOS_CREAR"),
  validarEmpleado,
  empleadosController.createEmpleado
);

/**
 * PUT /api/empleados/:id
 * Actualiza un empleado por ID
 */
router.put('/:id', requierePermiso("EMPLEADOS_EDITAR"), empleadosController.updateEmpleado);

/**
 * DELETE /api/empleados/:id
 * Elimina un empleado por ID
 */
router.delete('/:id', requierePermiso("EMPLEADOS_ELIMINAR"), empleadosController.deleteEmpleado);


export default router;
