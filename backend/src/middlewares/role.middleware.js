import { MENSAJES } from "../constantes/mensajes.js";

/**
 * Autorización por permiso (no por rol): los permisos de cada rol
 * viven en la BD (roles_permisos), así que cambiar qué puede hacer
 * un rol no requiere tocar código.
 *
 * Requiere que autenticar (auth.middleware) haya corrido antes.
 *
 * Uso: router.post("/", requierePermiso("EMPLEADOS_CREAR"), controller)
 */
export const requierePermiso = (permiso) => (req, res, next) => {
  const permisos = req.usuario?.permisos || [];

  if (!permisos.includes(permiso)) {
    return res.status(403).json({
      error: MENSAJES.AUTH.SIN_PERMISO
    });
  }

  next();
};
