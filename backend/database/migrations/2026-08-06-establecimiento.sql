/* =====================================================
   Migración: administración del establecimiento
   Fecha: 2026-08-06

   schema.sql solo se ejecuta al crear la base desde cero, así que las
   bases que ya existen (Docker local y la de Render) necesitan estos
   cambios aplicados a mano.

   Es idempotente: correrla dos veces no rompe ni duplica nada.

   Uso:
     docker cp backend/database/migrations/2026-08-06-establecimiento.sql \
       hotel-yacanto-postgres:/tmp/migracion.sql
     docker exec hotel-yacanto-postgres psql "<URL>" -f /tmp/migracion.sql
   ===================================================== */

BEGIN;

/* -----------------------------------------------------
   1. Permisos nuevos
   ----------------------------------------------------- */
INSERT INTO permisos (nombre) VALUES
  ('ESTABLECIMIENTO_CREAR'),
  ('ESTABLECIMIENTO_EDITAR'),
  ('ESTABLECIMIENTO_ELIMINAR')
ON CONFLICT (nombre) DO NOTHING;

/*
   Se otorgan SOLO al ADMINISTRADOR. Definir los puestos y lugares del
   hotel es una decisión de estructura, no de gestión de personal: RRHH
   los lee (GET /api/catalogos) pero no los modifica.
*/
INSERT INTO roles_permisos (id_rol, id_permiso)
SELECT r.id, p.id
FROM roles r, permisos p
WHERE r.nombre = 'ADMINISTRADOR'
  AND p.nombre IN (
    'ESTABLECIMIENTO_CREAR',
    'ESTABLECIMIENTO_EDITAR',
    'ESTABLECIMIENTO_ELIMINAR'
  )
ON CONFLICT DO NOTHING;

/* -----------------------------------------------------
   2. UNIQUE en los nombres de los catálogos

   Si alguna de estas falla con "could not create unique index" es
   porque ya hay nombres repetidos cargados. Detectarlos con:

     SELECT nombre, COUNT(*) FROM puestos
     GROUP BY nombre HAVING COUNT(*) > 1;

   Hay que unificarlos antes (reapuntar las FK al que se conserva).
   ----------------------------------------------------- */
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'puestos_nombre_key') THEN
    ALTER TABLE puestos ADD CONSTRAINT puestos_nombre_key UNIQUE (nombre);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'lugares_trabajo_nombre_key') THEN
    ALTER TABLE lugares_trabajo ADD CONSTRAINT lugares_trabajo_nombre_key UNIQUE (nombre);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'estados_nombre_key') THEN
    ALTER TABLE estados ADD CONSTRAINT estados_nombre_key UNIQUE (nombre);
  END IF;
END $$;

COMMIT;

/* Verificación rápida (debe listar los 3 permisos con el rol ADMINISTRADOR):

   SELECT r.nombre AS rol, p.nombre AS permiso
   FROM roles_permisos rp
   JOIN roles r    ON r.id = rp.id_rol
   JOIN permisos p ON p.id = rp.id_permiso
   WHERE p.nombre LIKE 'ESTABLECIMIENTO%'
   ORDER BY r.nombre;
*/
