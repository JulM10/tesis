/* =====================================================
   Migración: control de asistencia, licencias y color de puestos
   Fecha: 2026-09-22

   schema.sql solo se ejecuta al crear la base desde cero, así que las
   bases que ya existen (Docker local y la de Render) necesitan estos
   cambios aplicados a mano, con el usuario dueño del esquema (postgres):
   hotel_app no tiene permisos de DDL.

   Es idempotente: correrla dos veces no rompe ni duplica nada.

   Uso:
     docker cp backend/database/migrations/2026-09-22-asistencia-licencias.sql \
       hotel-yacanto-postgres:/tmp/migracion.sql
     docker exec hotel-yacanto-postgres psql "<URL>" -f /tmp/migracion.sql
   ===================================================== */

BEGIN;

/* -----------------------------------------------------
   1. Columnas nuevas
   ----------------------------------------------------- */
ALTER TABLE asignacion_horario
  ADD COLUMN IF NOT EXISTS hora_ingreso TIME,
  ADD COLUMN IF NOT EXISTS hora_egreso TIME;

ALTER TABLE asignacion_horario_historial
  ADD COLUMN IF NOT EXISTS estado_asistencia VARCHAR(12),
  ADD COLUMN IF NOT EXISTS hora_ingreso TIME,
  ADD COLUMN IF NOT EXISTS hora_egreso TIME,
  ADD COLUMN IF NOT EXISTS horas_trabajadas NUMERIC(5,2);

ALTER TABLE empleados
  ADD COLUMN IF NOT EXISTS dias_vacaciones_anuales INT NOT NULL DEFAULT 15;

ALTER TABLE puestos
  ADD COLUMN IF NOT EXISTS color VARCHAR(7) NOT NULL DEFAULT '#10b981';

-- Colores de partida para los puestos del seed, solo si nadie los cambió.
UPDATE puestos p
SET color = c.color
FROM (VALUES
  ('Mozo',           '#2563eb'),
  ('Cocinero',       '#ea580c'),
  ('Mantenimiento',  '#64748b'),
  ('Mucama',         '#db2777'),
  ('Administración', '#7c3aed')
) AS c(nombre, color)
WHERE p.nombre = c.nombre
  AND p.color = '#10b981';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_asistencia_egreso_con_ingreso') THEN
    ALTER TABLE asignacion_horario ADD CONSTRAINT chk_asistencia_egreso_con_ingreso
      CHECK (hora_egreso IS NULL OR hora_ingreso IS NOT NULL);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_asistencia_egreso_posterior') THEN
    ALTER TABLE asignacion_horario ADD CONSTRAINT chk_asistencia_egreso_posterior
      CHECK (hora_egreso IS NULL OR hora_egreso > hora_ingreso);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_dias_vacaciones_no_negativos') THEN
    ALTER TABLE empleados ADD CONSTRAINT chk_dias_vacaciones_no_negativos
      CHECK (dias_vacaciones_anuales >= 0);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_puesto_color') THEN
    ALTER TABLE puestos ADD CONSTRAINT chk_puesto_color
      CHECK (color ~ '^#[0-9a-f]{6}$');
  END IF;
END $$;

/* -----------------------------------------------------
   2. Tabla de licencias
   ----------------------------------------------------- */
CREATE TABLE IF NOT EXISTS licencias (
  id SERIAL PRIMARY KEY,
  id_empleado INT NOT NULL REFERENCES empleados(id) ON DELETE CASCADE,
  tipo VARCHAR(12) NOT NULL
    CHECK (tipo IN ('VACACIONES', 'ENFERMEDAD', 'ESPECIAL')),
  fecha_desde DATE NOT NULL,
  fecha_hasta DATE NOT NULL,
  comentario TEXT,
  fecha_registro TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_licencia_rango CHECK (fecha_hasta >= fecha_desde)
);

CREATE INDEX IF NOT EXISTS idx_licencias_empleado ON licencias(id_empleado);

-- El GRANT ON ALL TABLES de schema.sql solo alcanzó a las tablas que
-- existían en ese momento: la tabla nueva necesita el suyo.
GRANT SELECT, INSERT, UPDATE, DELETE ON licencias TO hotel_app;
GRANT USAGE, SELECT ON SEQUENCE licencias_id_seq TO hotel_app;

/* -----------------------------------------------------
   3. Limpieza del historial duplicado

   Antes de esta versión, asignar un turno escribía el historial en el
   momento (aunque el turno fuera futuro) y el archivado lo volvía a
   escribir cuando pasaba la fecha. Se borran:
   a) las filas de turnos que todavía no se archivaron (hoy o futuros):
      vinieron de la asignación, y el archivado las va a generar bien;
   b) los duplicados exactos de turnos pasados, conservando la fila del
      archivado (la de id mayor, que es la que se escribió después).
   ----------------------------------------------------- */
DELETE FROM asignacion_horario_historial
WHERE fecha >= CURRENT_DATE;

DELETE FROM asignacion_horario_historial h
USING asignacion_horario_historial otro
WHERE h.empleado_nombre = otro.empleado_nombre
  AND h.empleado_apellido = otro.empleado_apellido
  AND h.fecha = otro.fecha
  AND h.hora_inicio = otro.hora_inicio
  AND h.hora_fin = otro.hora_fin
  AND h.id < otro.id;

/* -----------------------------------------------------
   4. Vistas (columnas nuevas al final: es la única forma
      de cambiarlas con CREATE OR REPLACE VIEW)
   ----------------------------------------------------- */
CREATE OR REPLACE VIEW vw_horarios_empleado AS
SELECT
  e.id       AS empleado_id,
  e.nombre   AS empleado_nombre,
  e.apellido AS empleado_apellido,
  c.id       AS calendario_id,
  p.nombre   AS puesto,
  l.nombre   AS lugar_trabajo,
  c.fecha,
  c.hora_inicio,
  c.hora_fin,
  ah.hora_ingreso,
  ah.hora_egreso,
  ah.archivado,
  (SELECT li.tipo
     FROM licencias li
    WHERE li.id_empleado = e.id
      AND c.fecha BETWEEN li.fecha_desde AND li.fecha_hasta
    LIMIT 1) AS licencia
FROM empleados e
JOIN asignacion_horario ah ON ah.id_empleado = e.id
JOIN calendario c ON c.id = ah.id_calendario
JOIN puestos p ON p.id = e.id_puesto
JOIN lugares_trabajo l ON l.id = e.id_lugar;

CREATE OR REPLACE VIEW vw_empleados_detalle AS
SELECT
  e.id       AS empleado_id,
  e.nombre,
  e.apellido,
  e.dni,
  e.fecha_nacimiento,
  e.telefono,
  e.direccion,
  e.notas,
  cv.nombre      AS cv_nombre,
  cv.actualizado AS cv_actualizado,
  e.fecha_creacion,
  e.id_puesto,
  e.id_lugar,
  e.id_estado,
  p.nombre   AS puesto,
  l.nombre   AS lugar_trabajo,
  s.nombre   AS estado,
  u.id       AS usuario_id,
  u.email,
  u.activo,
  u.debe_cambiar_password,
  r.nombre   AS rol,
  e.dias_vacaciones_anuales
FROM empleados e
LEFT JOIN empleados_cv cv ON cv.id_empleado = e.id
LEFT JOIN usuarios u ON u.id = e.id_usuario
LEFT JOIN usuarios_roles ur ON ur.id_usuario = u.id
LEFT JOIN roles r ON r.id = ur.id_rol
LEFT JOIN puestos p ON p.id = e.id_puesto
LEFT JOIN lugares_trabajo l ON l.id = e.id_lugar
LEFT JOIN estados s ON s.id = e.id_estado;

CREATE OR REPLACE VIEW vw_reporte_historial_horarios AS
SELECT
  empleado_nombre,
  empleado_apellido,
  puesto,
  lugar_trabajo,
  fecha,
  hora_inicio,
  hora_fin,
  fecha_registro,
  estado_asistencia,
  hora_ingreso,
  hora_egreso,
  horas_trabajadas
FROM asignacion_horario_historial
ORDER BY fecha_registro DESC;

/* -----------------------------------------------------
   5. Rutinas
   ----------------------------------------------------- */
CREATE OR REPLACE PROCEDURE archivar_turnos_completados(INOUT archivados INT)
LANGUAGE plpgsql AS $$
BEGIN
  WITH pendientes AS (
    SELECT ah.id, e.nombre, e.apellido,
           COALESCE(pt.nombre, pe.nombre, 'Sin puesto') AS puesto,
           COALESCE(l.nombre, 'Sin lugar') AS lugar,
           c.fecha, c.hora_inicio, c.hora_fin,
           ah.hora_ingreso, ah.hora_egreso,
           (SELECT li.tipo
              FROM licencias li
             WHERE li.id_empleado = ah.id_empleado
               AND c.fecha BETWEEN li.fecha_desde AND li.fecha_hasta
             LIMIT 1) AS licencia
    FROM asignacion_horario ah
    JOIN calendario c ON c.id = ah.id_calendario
    JOIN empleados e ON e.id = ah.id_empleado
    LEFT JOIN puestos pt ON pt.id = c.id_puesto
    LEFT JOIN puestos pe ON pe.id = e.id_puesto
    LEFT JOIN lugares_trabajo l ON l.id = e.id_lugar
    -- Fecha argentina: CURRENT_DATE es la del servidor (UTC), que desde
    -- las 21 h de Argentina ya es el día siguiente.
    WHERE c.fecha < (now() AT TIME ZONE 'America/Argentina/Cordoba')::date - 1
      AND NOT ah.archivado
  ),
  clasificados AS (
    SELECT p.*,
           CASE
             WHEN p.licencia = 'ENFERMEDAD' THEN 'ENFERMEDAD'
             WHEN p.licencia IS NOT NULL    THEN 'LICENCIA'
             WHEN p.hora_ingreso IS NULL    THEN 'AUSENTE'
             WHEN p.hora_egreso IS NULL     THEN 'INCOMPLETO'
             ELSE 'PRESENTE'
           END AS estado
    FROM pendientes p
  ),
  insertados AS (
    INSERT INTO asignacion_horario_historial
      (empleado_nombre, empleado_apellido, puesto, lugar_trabajo, fecha, hora_inicio, hora_fin,
       estado_asistencia, hora_ingreso, hora_egreso, horas_trabajadas)
    SELECT nombre, apellido, puesto, lugar, fecha, hora_inicio, hora_fin,
           estado, hora_ingreso, hora_egreso,
           CASE
             WHEN estado IN ('PRESENTE', 'INCOMPLETO') THEN
               ROUND(GREATEST(0, EXTRACT(EPOCH FROM (
                 LEAST(COALESCE(hora_egreso, hora_fin), hora_fin)
                 - GREATEST(hora_ingreso, hora_inicio)
               )) / 3600)::numeric, 2)
             ELSE 0
           END
    FROM clasificados
    RETURNING 1
  )
  UPDATE asignacion_horario
  SET archivado = true
  WHERE id IN (SELECT id FROM pendientes);

  GET DIAGNOSTICS archivados = ROW_COUNT;
END;
$$;

-- Cambia el tipo de retorno: CREATE OR REPLACE no alcanza.
DROP FUNCTION IF EXISTS fn_horas_trabajadas(DATE, DATE);

CREATE FUNCTION fn_horas_trabajadas(p_desde DATE, p_hasta DATE)
RETURNS TABLE (
  empleado_nombre VARCHAR,
  empleado_apellido VARCHAR,
  puesto VARCHAR,
  turnos BIGINT,
  presentes BIGINT,
  ausencias BIGINT,
  licencias BIGINT,
  horas_programadas NUMERIC,
  horas_trabajadas NUMERIC
)
LANGUAGE sql STABLE AS $$
  SELECT
    h.empleado_nombre,
    h.empleado_apellido,
    h.puesto,
    COUNT(*),
    COUNT(*) FILTER (
      WHERE h.estado_asistencia IN ('PRESENTE', 'INCOMPLETO')
         OR h.estado_asistencia IS NULL
    ),
    COUNT(*) FILTER (WHERE h.estado_asistencia = 'AUSENTE'),
    COUNT(*) FILTER (WHERE h.estado_asistencia IN ('ENFERMEDAD', 'LICENCIA')),
    ROUND(SUM(EXTRACT(EPOCH FROM (h.hora_fin - h.hora_inicio)) / 3600)::numeric, 2),
    ROUND(SUM(COALESCE(
      h.horas_trabajadas,
      EXTRACT(EPOCH FROM (h.hora_fin - h.hora_inicio)) / 3600
    ))::numeric, 2) AS horas_reales
  FROM asignacion_horario_historial h
  WHERE h.fecha BETWEEN p_desde AND p_hasta
  GROUP BY h.empleado_nombre, h.empleado_apellido, h.puesto
  ORDER BY horas_reales DESC;
$$;

CREATE OR REPLACE PROCEDURE sincronizar_estado_licencias(INOUT actualizados INT)
LANGUAGE plpgsql AS $$
DECLARE
  hoy DATE := (now() AT TIME ZONE 'America/Argentina/Cordoba')::date;
BEGIN
  WITH objetivo AS (
    SELECT e.id,
           COALESCE(
             (SELECT s.id
                FROM licencias li
                JOIN estados s ON s.nombre =
                  CASE li.tipo WHEN 'VACACIONES' THEN 'Vacaciones' ELSE 'Enfermo' END
               WHERE li.id_empleado = e.id
                 AND li.tipo IN ('VACACIONES', 'ENFERMEDAD')
                 AND hoy BETWEEN li.fecha_desde AND li.fecha_hasta
               ORDER BY li.fecha_desde DESC
               LIMIT 1),
             (SELECT id FROM estados WHERE nombre = 'Activo')
           ) AS id_estado_nuevo
    FROM empleados e
    JOIN estados actual ON actual.id = e.id_estado
    WHERE actual.nombre IN ('Activo', 'Vacaciones', 'Enfermo')
  )
  UPDATE empleados e
  SET id_estado = o.id_estado_nuevo
  FROM objetivo o
  WHERE e.id = o.id
    AND e.id_estado IS DISTINCT FROM o.id_estado_nuevo;

  GET DIAGNOSTICS actualizados = ROW_COUNT;
END;
$$;

COMMIT;

/* Verificación rápida:

   -- columnas nuevas
   SELECT column_name FROM information_schema.columns
   WHERE table_name = 'asignacion_horario' AND column_name LIKE 'hora_%gres%';

   -- ningún turno duplicado en el historial (debe devolver 0 filas)
   SELECT empleado_nombre, empleado_apellido, fecha, hora_inicio, COUNT(*)
   FROM asignacion_horario_historial
   GROUP BY 1, 2, 3, 4 HAVING COUNT(*) > 1;
*/
