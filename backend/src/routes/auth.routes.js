import { Router } from "express";
import * as authController from "../controllers/auth.controllers.js";

const router = Router();

/**
 * POST /api/auth/login
 * Autentica un usuario con email y password.
 * Devuelve un JWT con roles y permisos (expira en 8h).
 */
router.post("/login", authController.login);

export default router;
