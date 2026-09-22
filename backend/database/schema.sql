/* =====================================================
   RBAC - ROLES Y PERMISOS
   ===================================================== */

CREATE TABLE roles (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE permisos (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE roles_permisos (
  id_rol INT NOT NULL,
  id_permiso INT NOT NULL,
  PRIMARY KEY (id_rol, id_permiso),
  FOREIGN KEY (id_rol) REFERENCES roles(id) ON DELETE CASCADE,
  FOREIGN KEY (id_permiso) REFERENCES permisos(id) ON DELETE CASCADE
);

/* =====================================================
   USUARIOS (AUTENTICACIÓN Y ACCESO)
   ===================================================== */

CREATE TABLE usuarios (
  id SERIAL PRIMARY KEY,
  email VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  /*
    La cuenta de un empleado se crea con una password DERIVADA de sus
    datos (nombre + apellido + últimos 4 dígitos del DNI). Es predecible
    a propósito: sirve para entregar la credencial, no para protegerla.
    Este flag la convierte en un secreto de un solo uso — mientras esté
    en TRUE el frontend obliga a cambiarla antes de operar.
  */
  debe_cambiar_password BOOLEAN NOT NULL DEFAULT TRUE,
  fecha_creacion_usuario TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE usuarios_roles (
  id_usuario INT NOT NULL,
  id_rol INT NOT NULL,
  PRIMARY KEY (id_usuario, id_rol),
  FOREIGN KEY (id_usuario) REFERENCES usuarios(id) ON DELETE CASCADE,
  FOREIGN KEY (id_rol) REFERENCES roles(id) ON DELETE CASCADE
);

/* =====================================================
   DOMINIO DEL NEGOCIO
   ===================================================== */

/*
  UNIQUE en los nombres: son catálogos que se eligen por nombre en la UI,
  así que dos filas homónimas serían indistinguibles para el usuario.
  Necesario además porque puestos y lugares se administran desde la
  pantalla de Configuración (permisos ESTABLECIMIENTO_*).
*/
CREATE TABLE puestos (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL UNIQUE,
  -- Color con el que el calendario pinta los turnos del puesto (#rrggbb).
  color VARCHAR(7) NOT NULL DEFAULT '#10b981'
    CONSTRAINT chk_puesto_color CHECK (color ~ '^#[0-9a-f]{6}$')
);

CREATE TABLE lugares_trabajo (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(50) NOT NULL UNIQUE
);

/*
  Los estados NO se administran desde la aplicación: sus nombres están
  acoplados a la lógica (indicadores del dashboard, colores de badge),
  así que renombrarlos en caliente rompería esas pantallas en silencio.
  Cambiarlos es una modificación de esquema, no una operación de usuario.
*/
CREATE TABLE estados(
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE empleados (
  id SERIAL PRIMARY KEY,
  id_usuario INT UNIQUE,
  nombre VARCHAR(100) NOT NULL,
  apellido VARCHAR(100) NOT NULL,
  /*
    Datos personales cifrados con AES-256-GCM EN LA APLICACIÓN
    (Ley 25.326, art. 9). La BD solo ve "enc:<iv>:<tag>:<cifrado>";
    la clave vive en el backend y nunca llega a Postgres.
    Por eso son TEXT y no DATE/VARCHAR: el cifrado ocupa más.
    Nombre y apellido quedan en claro por proporcionalidad
    (necesarios para listar/buscar; no son datos sensibles).

    El DNI va TEXT y no INT por dos motivos independientes:
    1) Cifrado, el valor almacenado es una cadena de ~58 caracteres.
    2) Aun en claro sería texto: es un identificador, no una cantidad.
       Como INT perdería los ceros a la izquierda (04123456 -> 4123456)
       y no admitiría CUIT ni pasaporte de personal extranjero.
    Consecuencia asumida: al ser el cifrado no determinístico (IV
    aleatorio por valor), NO se puede poner UNIQUE ni buscar por DNI.
    El sistema no detecta DNI duplicados. Se aceptó porque el DNI es
    solo un dato de ficha; si hiciera falta, se resolvería con un
    índice ciego (columna extra con HMAC-SHA256 del DNI normalizado).
  */
  dni TEXT,
  fecha_nacimiento TEXT,
  telefono TEXT,
  direccion TEXT,
  notas TEXT,
  id_puesto INT REFERENCES puestos(id),
  id_lugar INT REFERENCES lugares_trabajo(id),
  id_estado INT REFERENCES Estados(id),
  fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  -- Días corridos de vacaciones por año. RRHH lo ajusta por empleado.
  dias_vacaciones_anuales INT NOT NULL DEFAULT 15
    CONSTRAINT chk_dias_vacaciones_no_negativos CHECK (dias_vacaciones_anuales >= 0),
  FOREIGN KEY (id_usuario) REFERENCES usuarios(id) ON DELETE SET NULL
);

CREATE TABLE calendario (
  id SERIAL PRIMARY KEY,
  fecha DATE NOT NULL,
  hora_inicio TIME NOT NULL,
  hora_fin TIME NOT NULL,
  id_puesto INT REFERENCES puestos(id),
  -- Limitación conocida: no se soportan turnos que cruzan la medianoche
  CONSTRAINT chk_calendario_horario_valido CHECK (hora_fin > hora_inicio)
);

CREATE TABLE asignacion_horario (
  id SERIAL PRIMARY KEY,
  id_empleado INT NOT NULL REFERENCES empleados(id) ON DELETE CASCADE,
  id_calendario INT NOT NULL REFERENCES calendario(id) ON DELETE CASCADE,
  -- Marca de archivado: true cuando el turno ya fue copiado al historial
  -- por archivar_turnos_completados(). Evita duplicados (idempotencia).
  archivado BOOLEAN NOT NULL DEFAULT false,
  /*
    Control de asistencia: hora real (Argentina) de cada marca. TIME y no
    TIMESTAMP porque la fecha es la del turno y los turnos no cruzan la
    medianoche. NULL = todavía no marcó.
  */
  hora_ingreso TIME,
  hora_egreso TIME,
  UNIQUE (id_empleado, id_calendario),
  CONSTRAINT chk_asistencia_egreso_con_ingreso
    CHECK (hora_egreso IS NULL OR hora_ingreso IS NOT NULL),
  CONSTRAINT chk_asistencia_egreso_posterior
    CHECK (hora_egreso IS NULL OR hora_egreso > hora_ingreso)
);

/*
  CV adjunto del empleado (binario en Postgres, columna BYTEA).
  Tabla separada de "empleados" a propósito:
  - Los SELECT del listado nunca arrastran el binario (rendimiento).
  - Relación 1:1 forzada por PRIMARY KEY = FK.
  - ON DELETE CASCADE: al borrar el empleado, el CV se va con él.
  Mejora a futuro: mover el binario a un object storage (S3, Supabase,
  Cloudflare R2) tocando solo el módulo de queries/servicio de CV.
*/
CREATE TABLE empleados_cv (
  id_empleado INT PRIMARY KEY REFERENCES empleados(id) ON DELETE CASCADE,
  nombre VARCHAR(200) NOT NULL,
  mime VARCHAR(100) NOT NULL,
  archivo BYTEA NOT NULL,
  actualizado TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

/*
  Licencias del empleado (LCT): vacaciones (art. 150), enfermedad
  (art. 208) y especiales (art. 158: trámites, fallecimiento familiar...).
  Una sola tabla porque las tres cumplen el mismo rol: justificar que el
  empleado no esté disponible en un rango de fechas. Cambian las reglas,
  que viven en el servicio: solo VACACIONES descuenta del saldo anual.

  El comentario va CIFRADO (AES-256-GCM, como las notas): en una licencia
  por enfermedad puede incluir un diagnóstico, y los datos de salud son
  datos sensibles (Ley 25.326, art. 7).
*/
CREATE TABLE licencias (
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

/* =====================================================
   HISTORIAL DE HORARIOS (REPORTES)
   Guarda información histórica inmutable
   ===================================================== */

CREATE TABLE asignacion_horario_historial (
  id SERIAL PRIMARY KEY,
  empleado_nombre VARCHAR(100) NOT NULL,
  empleado_apellido VARCHAR(100) NOT NULL,
  puesto VARCHAR(100) NOT NULL,
  lugar_trabajo VARCHAR(100) NOT NULL,
  fecha DATE NOT NULL,
  hora_inicio TIME NOT NULL,
  hora_fin TIME NOT NULL,
  fecha_registro TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  /*
    Resultado de asistencia, congelado al archivar: PRESENTE, INCOMPLETO
    (ingresó pero no marcó egreso), AUSENTE, ENFERMEDAD o LICENCIA.
    NULL en registros anteriores al control de asistencia.
  */
  estado_asistencia VARCHAR(12),
  hora_ingreso TIME,
  hora_egreso TIME,
  horas_trabajadas NUMERIC(5,2)
);

/* =====================================================
   ÍNDICES
   ===================================================== */

CREATE INDEX idx_usuario_email ON usuarios(email);
CREATE INDEX idx_empleado_usuario ON empleados(id_usuario);
CREATE INDEX idx_empleado_puesto ON empleados(id_puesto);
CREATE INDEX idx_calendario_puesto ON calendario(id_puesto);
CREATE INDEX idx_asignacion_empleado ON asignacion_horario(id_empleado);

-- Reportes: el historial se filtra por rango de fechas y por puesto
CREATE INDEX idx_historial_fecha ON asignacion_horario_historial(fecha);
CREATE INDEX idx_historial_puesto ON asignacion_horario_historial(puesto);
-- Índice parcial: el archivador solo busca turnos NO archivados
CREATE INDEX idx_asignacion_no_archivada ON asignacion_horario(id) WHERE NOT archivado;
CREATE INDEX idx_licencias_empleado ON licencias(id_empleado);

/* =====================================================
   VISTAS
   ===================================================== */

/*
  Vista: vw_horarios_empleado
  Descripción:
  Muestra los horarios asignados a cada empleado con su puesto y lugar de trabajo.
  Se utiliza para consultas operativas y visualización en el frontend.
*/
CREATE VIEW vw_horarios_empleado AS
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
  -- Tipo de la licencia que cubre la fecha del turno (NULL si no hay).
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

/*
  Vista: vw_empleados_detalle
  Descripción:
  Devuelve el detalle completo de empleados incluyendo datos laborales,
  información de usuario y rol asignado.
  Ideal para pantallas de administración y RRHH.
*/
CREATE VIEW vw_empleados_detalle AS
SELECT
  e.id       AS empleado_id,
  e.nombre,
  e.apellido,
  -- Cifrado: solo se muestra en la ficha, no es filtrable desde SQL.
  e.dni,
  -- Cifrada: SQL no puede leerla. El backend la descifra y calcula
  -- la edad en la capa de servicios (utils/cifrado.js).
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
  -- El email del empleado vive acá y solo acá: usuarios es la única
  -- fuente de verdad. Es UNIQUE y tiene índice (idx_usuario_email),
  -- así que las búsquedas por email se resuelven sin duplicar el dato.
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

/*
  Vista: vw_usuarios_permisos
  Descripción:
  Expone los permisos efectivos de cada usuario según su rol.
  Se utiliza para auditoría, debug y validación de seguridad.
*/
CREATE VIEW vw_usuarios_permisos AS
SELECT
  u.id     AS usuario_id,
  u.email,
  r.nombre AS rol,
  p.nombre AS permiso
FROM usuarios u
JOIN usuarios_roles ur ON ur.id_usuario = u.id
JOIN roles r ON r.id = ur.id_rol
JOIN roles_permisos rp ON rp.id_rol = r.id
JOIN permisos p ON p.id = rp.id_permiso;

/*
  Vista: vw_reporte_empleados_puesto_lugar
  Descripción:
  Reporte agregado que muestra la cantidad de empleados
  agrupados por puesto y lugar de trabajo.
*/
CREATE VIEW vw_reporte_empleados_puesto_lugar AS
SELECT
  p.nombre AS puesto,
  l.nombre AS lugar_trabajo,
  COUNT(e.id) AS cantidad_empleados
FROM empleados e
JOIN puestos p ON p.id = e.id_puesto
JOIN lugares_trabajo l ON l.id = e.id_lugar
GROUP BY p.nombre, l.nombre;

/*
  Vista: vw_reporte_historial_horarios
  Descripción:
  Reporte histórico de horarios asignados a empleados.
  Utiliza datos desnormalizados para preservar la información
  aun cuando cambien los datos actuales del sistema.
*/
CREATE VIEW vw_reporte_historial_horarios AS
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

/* =====================================================
   RUTINAS DE REPORTES
   Cada herramienta para su trabajo:
   - Vistas: reportes de forma fija (solo lectura)
   - Función: agregaciones parametrizadas (rango de fechas)
   - Procedimiento: archivado (muta datos, transaccional)
   El historial guarda solo datos operativos + nombres (en
   claro por proporcionalidad), por lo que los reportes
   funcionan 100% en SQL sin descifrar nada.
   ===================================================== */

/*
  Procedimiento: archivar_turnos_completados
  Copia al historial los turnos ya cerrados que aún no fueron
  archivados y los marca (idempotente: correr dos veces no duplica).
  El backend lo invoca al arrancar y cada hora.
  Devuelve en el parámetro INOUT la cantidad archivada.
  El puesto registrado es el del turno (qué rol se cubrió);
  el lugar, el del empleado.

  Un día de gracia (fecha < ayer): RRHH puede corregir marcas o
  cargar una licencia al día siguiente, antes de que el resultado
  quede congelado.

  Estado de asistencia, en orden de prioridad:
    ENFERMEDAD / LICENCIA  una licencia cubre la fecha (0 h, no es ausencia)
    AUSENTE                sin ingreso (0 h)
    INCOMPLETO             ingreso sin egreso (asistió, pero 0 h)
    PRESENTE               ingreso y egreso
  Horas trabajadas = lo cubierto DEL TURNO: desde max(ingreso, inicio)
  hasta min(egreso, fin). La tardanza y la salida anticipada descuentan;
  las horas extra no cuentan.
  Solo se computan horas con las DOS marcas: si un ingreso sin salida
  sumara el turno completo, alcanzaría con marcar al llegar e irse.
  Si fue un olvido, RRHH carga la salida durante el día de gracia.
*/
CREATE PROCEDURE archivar_turnos_completados(INOUT archivados INT)
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
             WHEN estado = 'PRESENTE' THEN
               ROUND(GREATEST(0, EXTRACT(EPOCH FROM (
                 LEAST(hora_egreso, hora_fin) - GREATEST(hora_ingreso, hora_inicio)
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

/*
  Función: fn_horas_trabajadas
  Agregación parametrizada sobre el historial: turnos, asistencia y
  horas por empleado y puesto en un rango de fechas.
  Base del reporte con filtros y del export CSV.
  Los registros anteriores al control de asistencia (estado NULL) se
  cuentan como presentes con sus horas programadas: antes no había forma
  de saber otra cosa.
  "sin_salida" (INCOMPLETO) va aparte de "presentes": asistió, pero sus
  horas son 0 hasta que RRHH cargue la salida.
*/
CREATE FUNCTION fn_horas_trabajadas(p_desde DATE, p_hasta DATE)
RETURNS TABLE (
  empleado_nombre VARCHAR,
  empleado_apellido VARCHAR,
  puesto VARCHAR,
  turnos BIGINT,
  presentes BIGINT,
  sin_salida BIGINT,
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
      WHERE h.estado_asistencia = 'PRESENTE' OR h.estado_asistencia IS NULL
    ),
    COUNT(*) FILTER (WHERE h.estado_asistencia = 'INCOMPLETO'),
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

/*
  Procedimiento: sincronizar_estado_licencias
  Mantiene el estado del empleado alineado con sus licencias vigentes
  HOY (fecha argentina): Vacaciones o Enfermo mientras dura la licencia,
  Activo cuando termina. Solo actúa entre Activo, Vacaciones y Enfermo:
  Inactivo, Suspendido y Despedido son decisiones de RRHH que ninguna
  licencia debe pisar. Las licencias ESPECIALES no cambian el estado.
  El backend lo invoca al arrancar, cada hora y al crear o borrar una
  licencia. Devuelve en el INOUT cuántos empleados cambiaron.
*/
CREATE PROCEDURE sincronizar_estado_licencias(INOUT actualizados INT)
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

/* =====================================================
   SEGURIDAD: ROL DE APLICACIÓN CON MÍNIMOS PRIVILEGIOS
   El backend NO se conecta como superusuario: usa hotel_app,
   que solo puede hacer DML (SELECT/INSERT/UPDATE/DELETE) sobre
   las tablas de la app. Sin DDL: si comprometen el backend, no
   pueden alterar ni tirar el esquema. El superusuario postgres
   queda solo para administración (docker exec).
   ===================================================== */

CREATE ROLE hotel_app LOGIN PASSWORD 'hotel_app_dev_2026';

GRANT USAGE ON SCHEMA public TO hotel_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO hotel_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO hotel_app;