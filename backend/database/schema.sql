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
  fecha_nacimiento DATE,
  telefono VARCHAR(20),
  direccion VARCHAR(200),
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
  e.fecha_nacimiento,
  -- La edad no se almacena: se deriva de la fecha de nacimiento
  EXTRACT(YEAR FROM age(e.fecha_nacimiento))::int AS edad,
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