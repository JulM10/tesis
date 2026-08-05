import { Router } from "express";
import * as usuariosController from "../controllers/usuarios.controllers.js";
import { requierePermiso } from "../middlewares/role.middleware.js";
import { validarUsuario } from "../middlewares/validarUsuario.middleware.js";

const router = Router();

/**
 * GET /api/usuarios/roles
 * Lista de roles disponibles (para el select de alta).
 * IMPORTANTE: antes de /:id para que no lo capture.
 */
router.get("/roles", requierePermiso("USUARIOS_VER"), usuariosController.getRoles);

/**
 * GET /api/usuarios
 * Listado de usuarios con rol y empleado vinculado
 */
router.get("/", requierePermiso("USUARIOS_VER"), usuariosController.getUsuarios);

/**
 * POST /api/usuarios
 * Crea un usuario: { email, password, id_rol, id_empleado? }
 */
router.post("/", requierePermiso("USUARIOS_CREAR"), validarUsuario, usuariosController.createUsuario);

/**
 * PUT /api/usuarios/:id
 * Actualiza email, estado y/o rol: { email?, activo?, id_rol? }
 */
router.put("/:id", requierePermiso("USUARIOS_EDITAR"), usuariosController.updateUsuario);

/**
 * POST /api/usuarios/:id/reset-password
 * Resetea la contraseña de un usuario a una temporal aleatoria y fuerza
 * su cambio en el próximo login. Devuelve la temporal una única vez.
 */
router.post("/:id/reset-password", requierePermiso("USUARIOS_EDITAR"), usuariosController.resetPassword);

/**
 * DELETE /api/usuarios/:id
 * Elimina un usuario (solo ADMINISTRADOR tiene USUARIOS_ELIMINAR;
 * el empleado vinculado queda con id_usuario en NULL)
 */
router.delete("/:id", requierePermiso("USUARIOS_ELIMINAR"), usuariosController.deleteUsuario);

export default router;
