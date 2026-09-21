import { Router } from 'express';
import * as empleadosController from "../controllers/empleados.controllers.js";
import * as licenciasController from "../controllers/licencias.controllers.js";
import { validarEmpleado } from '../middlewares/validarEmpleado.middleware.js';
import { validarLicencia } from '../middlewares/validarLicencia.middleware.js';
import { requierePermiso } from '../middlewares/role.middleware.js';
import { subirCV } from '../middlewares/subirCV.middleware.js';

const router = Router();

/**
 * GET /api/empleados
 * Obtiene el listado de empleados
 */
router.get("/", requierePermiso("EMPLEADOS_VER"), empleadosController.getEmpleados);

/**
 * GET /api/empleados/detalle
 * Listado con puesto, lugar, estado y usuario resueltos (vista).
 * IMPORTANTE: debe declararse antes de /:id para que no lo capture.
 */
router.get("/detalle", requierePermiso("EMPLEADOS_VER"), empleadosController.getEmpleadosDetalle);

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

/**
 * POST /api/empleados/:id/cv
 * Sube o reemplaza el CV del empleado (form-data, campo "cv", PDF/DOCX, máx 5MB)
 */
router.post('/:id/cv', requierePermiso("EMPLEADOS_EDITAR"), subirCV, empleadosController.subirCV);

/**
 * GET /api/empleados/:id/cv
 * Descarga el CV del empleado (el archivo nunca se expone por URL pública)
 */
router.get('/:id/cv', requierePermiso("EMPLEADOS_VER"), empleadosController.descargarCV);

/**
 * DELETE /api/empleados/:id/cv
 * Elimina el CV del empleado
 */
router.delete('/:id/cv', requierePermiso("EMPLEADOS_EDITAR"), empleadosController.eliminarCV);

/**
 * GET /api/empleados/:id/licencias?anio=AAAA
 * Licencias del empleado + saldo de vacaciones del año (por defecto, el actual)
 */
router.get('/:id/licencias', requierePermiso("EMPLEADOS_VER"), licenciasController.getLicencias);

/**
 * POST /api/empleados/:id/licencias
 * Registra una licencia: { tipo, fecha_desde, fecha_hasta, comentario? }
 */
router.post(
  '/:id/licencias',
  requierePermiso("EMPLEADOS_EDITAR"),
  validarLicencia,
  licenciasController.crearLicencia
);

/**
 * DELETE /api/empleados/:id/licencias/:idLicencia
 * Elimina una licencia del empleado
 */
router.delete(
  '/:id/licencias/:idLicencia',
  requierePermiso("EMPLEADOS_EDITAR"),
  licenciasController.eliminarLicencia
);


export default router;
