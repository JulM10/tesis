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

-- ADMINISTRADOR: todos los permisos
INSERT INTO roles_permisos
SELECT r.id, p.id
FROM roles r, permisos p
WHERE r.nombre = 'ADMINISTRADOR';

-- RRHH: todos menos eliminar usuarios
INSERT INTO roles_permisos
SELECT r.id, p.id
FROM roles r
JOIN permisos p ON p.nombre <> 'USUARIOS_ELIMINAR'
WHERE r.nombre = 'RRHH';

-- EMPLEADO: solo lectura
INSERT INTO roles_permisos
SELECT r.id, p.id
FROM roles r
JOIN permisos p ON p.nombre IN ('EMPLEADOS_VER', 'CALENDARIO_VER')
WHERE r.nombre = 'EMPLEADO';

/* =====================================================
   USUARIOS
   ===================================================== */

INSERT INTO usuarios (email, password_hash) VALUES
('admin@hotel.com',    '$2b$10$fakehashadmin'),
('rrhh@hotel.com',     '$2b$10$fakehashrrhh'),
('empleado@hotel.com', '$2b$10$fakehashemp');

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
WHERE u.email = 'empleado@hotel.com' AND r.nombre = 'EMPLEADO';

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

/* =====================================================
   EMPLEADOS (1–1 con usuarios)
   ===================================================== */

INSERT INTO empleados (id_usuario, nombre, apellido, edad, id_puesto, id_lugar)
SELECT u.id, 'Juan', 'Pérez', 30, 1, 1
FROM usuarios u
WHERE u.email = 'empleado@hotel.com';

/* =====================================================
   CALENDARIO
   ===================================================== */

INSERT INTO calendario (fecha, hora_inicio, hora_fin, id_puesto) VALUES
('2025-11-20', '08:00', '16:00', 1),
('2025-11-21', '09:00', '17:00', 2),
('2025-11-22', '10:00', '18:00', 1);

/* =====================================================
   ASIGNACIÓN HORARIA
   ===================================================== */

INSERT INTO asignacion_horario (id_empleado, id_calendario)
VALUES
(1, 1),
(1, 3);