import { Router } from "express";
import * as asistenciaController from "../controllers/asistencia.controllers.js";
import { autenticarKiosco } from "../middlewares/kiosco.middleware.js";

const router = Router();

/*
  Rutas del kiosco de asistencia. No pasan por autenticar (JWT): el
  kiosco es un equipo, no un usuario. Se autentica con X-Kiosco-Clave.

  El marcado del empleado está en POST /api/me/asistencia (con su
  sesión) y la corrección de RRHH en
  PUT /api/horarios/asignar/:id_empleado/:id_calendario/asistencia.
*/

/**
 * GET /api/asistencia/codigo
 * Código de 6 dígitos vigente y segundos que le quedan
 */
router.get("/codigo", autenticarKiosco, asistenciaController.getCodigo);

export default router;
