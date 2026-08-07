import { Router } from "express";
import * as establecimientoController from "../controllers/establecimiento.controllers.js";
import { requierePermiso } from "../middlewares/role.middleware.js";

const router = Router();

/*
  ABM de la estructura del hotel. :tipo es "puestos" o "lugares"; cualquier
  otro valor responde 404 (la lista blanca vive en el service).

  La LECTURA no está acá: sigue en GET /api/catalogos, que solo pide sesión
  porque todas las pantallas necesitan estos catálogos para armar selects y
  filtros. Acá viven solo las operaciones que modifican, reservadas al
  ADMINISTRADOR mediante los permisos ESTABLECIMIENTO_*.
*/

/** POST /api/establecimiento/:tipo — body: { nombre } */
router.post("/:tipo", requierePermiso("ESTABLECIMIENTO_CREAR"), establecimientoController.crear);

/** PUT /api/establecimiento/:tipo/:id — body: { nombre } */
router.put("/:tipo/:id", requierePermiso("ESTABLECIMIENTO_EDITAR"), establecimientoController.editar);

/** DELETE /api/establecimiento/:tipo/:id — 409 si está en uso */
router.delete("/:tipo/:id", requierePermiso("ESTABLECIMIENTO_ELIMINAR"), establecimientoController.eliminar);

export default router;
