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

INSERT INTO roles_permisos
SELECT r.id, p.id
FROM roles r
JOIN permisos p ON p.nombre IN ('EMPLEADOS_VER', 'CALENDARIO_VER')
WHERE r.nombre = 'EMPLEADO';

/* =====================================================
   USUARIOS
   ===================================================== */

INSERT INTO usuarios (email, password_hash, activo) VALUES
('admin@hotel.com',    '$2b$10$fakehashadmin', true),
('rrhh@hotel.com',     '$2b$10$fakehashrrhh', true),
('empleado@hotel.com', '$2b$10$fakehashemp', true),
('empleado2@hotel.com','$2b$10$fakehash2', true),
('inactivo@hotel.com', '$2b$10$fakehash3', false),
('sinrol@hotel.com',   '$2b$10$fakehash4', true);

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

-- Empleado ACTIVO con usuario activo (caso happy path)
INSERT INTO empleados (id_usuario,nombre,apellido,edad,telefono,direccion,id_puesto,id_lugar,id_estado)
SELECT u.id,'Juan','Pérez',30,'3544550482','Calle Principal 123',2,1,1
FROM usuarios u WHERE u.email='empleado@hotel.com';

-- Empleado ACTIVO con usuario activo pero sin horarios asignados
INSERT INTO empleados (id_usuario,nombre,apellido,edad,telefono,direccion,id_puesto,id_lugar,id_estado)
SELECT u.id,'Ana','Gómez',28,'3511234567','Av. Siempre Viva 742',4,5,1
FROM usuarios u WHERE u.email='empleado2@hotel.com';

-- Empleado INACTIVO asociado a usuario inactivo
INSERT INTO empleados (id_usuario,nombre,apellido,edad,telefono,direccion,id_puesto,id_lugar,id_estado)
SELECT u.id,'Carlos','Ruiz',45,'3419876543','Ruta 9 Km 12',3,1,2
FROM usuarios u WHERE u.email='inactivo@hotel.com';

-- Empleado SIN usuario asociado (caso onboarding / alta previa a usuario)
INSERT INTO empleados (nombre,apellido,edad,telefono,direccion,id_puesto,id_lugar,id_estado)
VALUES ('Lucía','Fernández',22,'3515558899','Pasaje Norte 55',2,1,1);

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
