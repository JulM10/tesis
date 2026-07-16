/* =====================================================
   ROLES
   ===================================================== */

INSERT INTO roles (nombre) VALUES
('ADMINISTRADOR'),
('RRHH'),
('EMPLEADO');

/* =====================================================
   PERMISOS
   ===================================================== */

INSERT INTO permisos (nombre) VALUES
('USUARIOS_VER'),
('USUARIOS_CREAR'),
('USUARIOS_EDITAR'),
('USUARIOS_ELIMINAR'),
('EMPLEADOS_VER'),
('EMPLEADOS_CREAR'),
('EMPLEADOS_EDITAR'),
('EMPLEADOS_ELIMINAR'),
('CALENDARIO_VER'),
('CALENDARIO_CREAR'),
('CALENDARIO_EDITAR'),
('CALENDARIO_ELIMINAR');

/* =====================================================
   ROLES → PERMISOS
   ===================================================== */

INSERT INTO roles_permisos
SELECT r.id, p.id
FROM roles r, permisos p
WHERE r.nombre = 'ADMINISTRADOR';

INSERT INTO roles_permisos
SELECT r.id, p.id
FROM roles r
JOIN permisos p ON p.nombre <> 'USUARIOS_ELIMINAR'
WHERE r.nombre = 'RRHH';

/*
  El rol EMPLEADO no tiene EMPLEADOS_VER: los datos personales del resto
  del personal no le corresponden (Ley 25.326). Su propia información la
  accede vía GET /api/me. Sí conserva CALENDARIO_VER para ver la grilla
  de turnos (dato operativo, no personal).
*/
INSERT INTO roles_permisos
SELECT r.id, p.id
FROM roles r
JOIN permisos p ON p.nombre IN ('CALENDARIO_VER')
WHERE r.nombre = 'EMPLEADO';

/* =====================================================
   USUARIOS
   ===================================================== */

/*
  Hashes bcrypt reales (cost 10). Passwords de demo:
  admin@hotel.com     → Admin123!
  rrhh@hotel.com      → Rrhh123!
  empleado@hotel.com  → Empleado123!
  empleado2@hotel.com → Empleado123!
  inactivo@hotel.com  → Inactivo123!  (no puede loguear: activo = false)
  sinrol@hotel.com    → Sinrol123!    (loguea pero sin permisos)
*/
INSERT INTO usuarios (email, password_hash, activo) VALUES
('admin@hotel.com',    '$2b$10$45Q30PUV25yBDDFCUSWF0.ZmocJmoa5LE6ECFhYe3QibPCLi4PZFi', true),
('rrhh@hotel.com',     '$2b$10$k9jtyHf5kVCji88wNESS.Om.yqP8fkxu2cLALd4xbTziYJ3N7/Iya', true),
('empleado@hotel.com', '$2b$10$t7VcEeUniVKpc.fdbVT4k.MNZxwVc7NJAD0ZkNcaBO6ZEocbRjSZ2', true),
('empleado2@hotel.com','$2b$10$6UBLfVdYv0HxtHgWb1POuu4LVG1AzzbF/JIWhhCLjdbnP9vvtjmza', true),
('inactivo@hotel.com', '$2b$10$fTAFEYlxhIxWZRCl2PH.yuaJmNYD46cBek4RZrm7XP8M5MmAEPueW', false),
('sinrol@hotel.com',   '$2b$10$Cl2F.3V8KNZe1FwQNbGJBOch2Sk.S8kKoSBiXIyb930hpRSzKCu2C', true);

/* =====================================================
   USUARIOS → ROLES
   ===================================================== */

INSERT INTO usuarios_roles
SELECT u.id, r.id FROM usuarios u, roles r
WHERE u.email = 'admin@hotel.com' AND r.nombre = 'ADMINISTRADOR';

INSERT INTO usuarios_roles
SELECT u.id, r.id FROM usuarios u, roles r
WHERE u.email = 'rrhh@hotel.com' AND r.nombre = 'RRHH';

INSERT INTO usuarios_roles
SELECT u.id, r.id FROM usuarios u, roles r
WHERE u.email IN ('empleado@hotel.com','empleado2@hotel.com')
AND r.nombre = 'EMPLEADO';

/* =====================================================
   DATOS DEL NEGOCIO
   ===================================================== */

INSERT INTO puestos (nombre) VALUES
('Mozo'),
('Cocinero'),
('Mantenimiento'),
('Mucama'),
('Administración');

INSERT INTO lugares_trabajo (nombre) VALUES
('Cocina'),
('Bar'),
('Pileta'),
('Oficina'),
('Edificio Principal');

INSERT INTO estados (nombre) VALUES
('Activo'),
('Inactivo'),
('Vacaciones'),
('Enfermo'),
('Suspendido'),
('Despedido');

/* =====================================================
   EMPLEADOS
   ===================================================== */

-- Empleado ACTIVO con usuario activo (caso happy path) - Más antiguo (2020)
INSERT INTO empleados (id_usuario,nombre,apellido,edad,fecha_nacimiento,telefono,direccion,id_puesto,id_lugar,id_estado,fecha_creacion)
SELECT u.id,'Juan','Pérez',30,'1996-03-10','3544550482','Calle Principal 123',2,1,1,'2020-05-10T10:30:00Z'
FROM usuarios u WHERE u.email='empleado@hotel.com';

-- Empleado ACTIVO con usuario activo pero sin horarios asignados (2022)
INSERT INTO empleados (id_usuario,nombre,apellido,edad,fecha_nacimiento,telefono,direccion,id_puesto,id_lugar,id_estado,fecha_creacion)
SELECT u.id,'Ana','Gómez',28,'1998-07-15','3511234567','Av. Siempre Viva 742',4,5,1,'2022-06-15T14:20:00Z'
FROM usuarios u WHERE u.email='empleado2@hotel.com';

-- Empleado INACTIVO asociado a usuario inactivo (2021)
INSERT INTO empleados (id_usuario,nombre,apellido,edad,fecha_nacimiento,telefono,direccion,id_puesto,id_lugar,id_estado,fecha_creacion)
SELECT u.id,'Carlos','Ruiz',45,'1981-05-22','3419876543','Ruta 9 Km 12',3,1,2,'2021-11-20T09:45:00Z'
FROM usuarios u WHERE u.email='inactivo@hotel.com';

-- Empleado SIN usuario asociado (caso onboarding / alta previa a usuario) (2023)
INSERT INTO empleados (nombre,apellido,edad,fecha_nacimiento,telefono,direccion,id_puesto,id_lugar,id_estado,fecha_creacion)
VALUES ('Lucía','Fernández',22,'2004-09-08','3515558899','Pasaje Norte 55',2,1,1,'2023-01-30T11:15:00Z');

/* =====================================================
   CALENDARIO
   ===================================================== */

INSERT INTO calendario (fecha, hora_inicio, hora_fin, id_puesto) VALUES
('2025-11-20', '08:00', '16:00', 1),
('2025-11-20', '16:00', '23:00', 1),
('2025-11-21', '09:00', '17:00', 2),
('2025-11-22', '10:00', '18:00', 4),
('2025-11-23', '07:00', '15:00', 3);

/* =====================================================
   ASIGNACIÓN HORARIA
   ===================================================== */

-- Juan tiene dos turnos
INSERT INTO asignacion_horario (id_empleado, id_calendario)
VALUES
(1, 1),
(1, 2);

-- Carlos (usuario inactivo) tiene historial
INSERT INTO asignacion_horario (id_empleado, id_calendario)
VALUES
(3, 5);

/* =====================================================
   HISTORIAL (ejemplo histórico manual)
   ===================================================== */

INSERT INTO asignacion_horario_historial
(empleado_nombre, empleado_apellido, puesto, lugar_trabajo, fecha, hora_inicio, hora_fin)
VALUES
('Juan','Pérez','Mozo','Bar','2025-10-10','08:00','16:00'),
('Carlos','Ruiz','Mantenimiento','Cocina','2025-10-11','07:00','15:00');
