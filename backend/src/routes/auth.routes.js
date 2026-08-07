import { Router } from "express";
import * as authController from "../controllers/auth.controllers.js";
import { autenticar } from "../middlewares/auth.middleware.js";

const router = Router();

/**
 * POST /api/auth/login
 * Autentica un usuario con email y password.
 * Devuelve un JWT con roles y permisos (expira en 15m) y el flag
 * debe_cambiar_password.
 */
router.post("/login", authController.login);

/**
 * POST /api/auth/renovar
 * Emite un token nuevo para el usuario autenticado. El frontend la llama
 * mientras hay actividad, así una sesión en uso no se corta.
 * Relee roles y permisos de la BD y rechaza cuentas desactivadas: es lo
 * que acota la ventana de revocación de un JWT sin estado.
 */
router.post("/renovar", autenticar, authController.renovar);

/**
 * POST /api/auth/cambiar-password
 * Rota la password del usuario autenticado y baja el flag
 * debe_cambiar_password. Body: { password_actual, password_nueva }.
 * Solo requiere estar autenticado: no lleva permiso porque cualquier
 * usuario debe poder cambiar su propia credencial.
 */
router.post("/cambiar-password", autenticar, authController.cambiarPassword);

export default router;
