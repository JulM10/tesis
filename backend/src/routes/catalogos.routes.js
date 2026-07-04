import { Router } from "express";
import * as catalogosController from "../controllers/catalogos.controllers.js";

const router = Router();

/**
 * GET /api/catalogos
 * Devuelve puestos, lugares de trabajo y estados.
 * Solo requiere sesión (cualquier usuario autenticado los necesita
 * para leer formularios y filtros).
 */
router.get("/", catalogosController.getCatalogos);

export default router;
