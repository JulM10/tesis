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

CREATE TABLE puestos (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL
);

CREATE TABLE lugares_trabajo (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(50) NOT NULL
);
CREATE TABLE estados(
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(50) NOT NULL
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
  UNIQUE (id_empleado, id_calendario)
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
  fecha_registro TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
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
  c.hora_fin
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
  r.nombre   AS rol
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
  fecha_registro
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
  Copia al historial los turnos con fecha pasada que aún no
  fueron archivados y los marca (idempotente: correr dos veces
  no duplica). El backend lo invoca al arrancar.
  Devuelve en el parámetro INOUT la cantidad archivada.
  El puesto registrado es el del turno (qué rol se cubrió);
  el lugar, el del empleado.
*/
CREATE PROCEDURE archivar_turnos_completados(INOUT archivados INT)
LANGUAGE plpgsql AS $$
BEGIN
  WITH pendientes AS (
    SELECT ah.id, e.nombre, e.apellido,
           COALESCE(pt.nombre, pe.nombre, 'Sin puesto') AS puesto,
           COALESCE(l.nombre, 'Sin lugar') AS lugar,
           c.fecha, c.hora_inicio, c.hora_fin
    FROM asignacion_horario ah
    JOIN calendario c ON c.id = ah.id_calendario
    JOIN empleados e ON e.id = ah.id_empleado
    LEFT JOIN puestos pt ON pt.id = c.id_puesto
    LEFT JOIN puestos pe ON pe.id = e.id_puesto
    LEFT JOIN lugares_trabajo l ON l.id = e.id_lugar
    WHERE c.fecha < CURRENT_DATE
      AND NOT ah.archivado
  ),
  insertados AS (
    INSERT INTO asignacion_horario_historial
      (empleado_nombre, empleado_apellido, puesto, lugar_trabajo, fecha, hora_inicio, hora_fin)
    SELECT nombre, apellido, puesto, lugar, fecha, hora_inicio, hora_fin
    FROM pendientes
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
  Agregación parametrizada sobre el historial: turnos y horas
  trabajadas por empleado y puesto en un rango de fechas.
  Base del reporte con filtros y del export CSV.
*/
CREATE FUNCTION fn_horas_trabajadas(p_desde DATE, p_hasta DATE)
RETURNS TABLE (
  empleado_nombre VARCHAR,
  empleado_apellido VARCHAR,
  puesto VARCHAR,
  turnos BIGINT,
  horas NUMERIC
)
LANGUAGE sql STABLE AS $$
  SELECT
    empleado_nombre,
    empleado_apellido,
    puesto,
    COUNT(*) AS turnos,
    ROUND(SUM(EXTRACT(EPOCH FROM (hora_fin - hora_inicio)) / 3600)::numeric, 2) AS horas
  FROM asignacion_horario_historial
  WHERE fecha BETWEEN p_desde AND p_hasta
  GROUP BY empleado_nombre, empleado_apellido, puesto
  ORDER BY horas DESC;
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