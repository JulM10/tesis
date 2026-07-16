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

INSERT INTO empleados (id_usuario,nombre,apellido,fecha_nacimiento,telefono,direccion,id_puesto,id_lugar,id_estado,fecha_creacion)
SELECT u.id,'Juan','Pérez','1996-03-10','3544550482','Calle Principal 123',2,1,1,'2020-05-10T10:30:00Z'
FROM usuarios u WHERE u.email='empleado@hotel.com';

INSERT INTO empleados (id_usuario,nombre,apellido,fecha_nacimiento,telefono,direccion,id_puesto,id_lugar,id_estado,fecha_creacion)
SELECT u.id,'Ana','Gómez','1998-07-15','3511234567','Av. Siempre Viva 742',4,5,1,'2022-06-15T14:20:00Z'
FROM usuarios u WHERE u.email='empleado2@hotel.com';

INSERT INTO empleados (id_usuario,nombre,apellido,fecha_nacimiento,telefono,direccion,id_puesto,id_lugar,id_estado,fecha_creacion)
SELECT u.id,'Carlos','Ruiz','1981-05-22','3419876543','Ruta 9 Km 12',3,1,2,'2021-11-20T09:45:00Z'
FROM usuarios u WHERE u.email='inactivo@hotel.com';

INSERT INTO empleados (nombre,apellido,fecha_nacimiento,telefono,direccion,id_puesto,id_lugar,id_estado,fecha_creacion)
VALUES ('Lucía','Fernández','2004-09-08','3515558899','Pasaje Norte 55',2,1,1,'2023-01-30T11:15:00Z');

-- 16 empleados adicionales
INSERT INTO empleados (nombre,apellido,fecha_nacimiento,telefono,direccion,id_puesto,id_lugar,id_estado,fecha_creacion)
VALUES
('Diego','López','1989-12-05','3541234567','Calle 5 #45',1,2,1,'2019-08-22T08:00:00Z'),
('María','García','1999-03-18','3542345678','Calle 10 #67',2,3,1,'2021-02-14T09:30:00Z'),
('Roberto','Martínez','1982-07-30','3543456789','Calle 15 #89',3,1,1,'2018-11-05T10:15:00Z'),
('Patricia','Rodríguez','1993-09-12','3544567890','Calle 20 #123',4,5,1,'2020-03-20T11:45:00Z'),
('Francisco','Sánchez','1986-01-25','3545678901','Calle 25 #145',1,4,1,'2019-06-18T13:20:00Z'),
('Elena','Torres','1997-05-08','3546789012','Calle 30 #167',2,2,1,'2022-01-10T14:50:00Z'),
('José','Jiménez','1980-11-14','3547890123','Calle 35 #189',5,3,1,'2017-09-28T15:30:00Z'),
('Isabel','Vargas','2000-08-20','3548901234','Calle 40 #201',4,1,1,'2023-05-12T16:00:00Z'),
('Miguel','Castro','1991-04-03','3549012345','Calle 45 #223',1,5,1,'2021-07-08T08:30:00Z'),
('Carmen','Moreno','1984-10-16','3550123456','Calle 50 #245',3,2,1,'2019-04-25T09:45:00Z'),
('Antonio','Díaz','1988-02-27','3551234567','Calle 55 #267',2,4,1,'2020-12-01T10:20:00Z'),
('Rosa','Fernández','2001-06-09','3552345678','Calle 60 #289',5,3,1,'2023-03-14T11:15:00Z'),
('Luis','Ramos','1983-08-11','3553456789','Calle 65 #301',1,1,1,'2018-10-19T12:30:00Z'),
('Laura','Navarro','1994-12-24','3554567890','Calle 70 #323',4,5,1,'2021-05-07T13:45:00Z'),
('Javier','Cortés','1987-03-15','3555678901','Calle 75 #345',2,2,1,'2020-08-30T14:20:00Z'),
('Sofía','Herrera','1998-09-02','3556789012','Calle 80 #367',3,4,1,'2022-02-18T15:50:00Z');

/* =====================================================
   CALENDARIO (Semana del 15-21 de julio de 2026)
   ===================================================== */

-- LUNES 15/07 (Mozo - Puesto 1)
INSERT INTO calendario (fecha, hora_inicio, hora_fin, id_puesto) VALUES
('2026-07-15', '08:00', '16:00', 1),
('2026-07-15', '16:00', '23:00', 1);

-- LUNES 15/07 (Cocinero - Puesto 2)
INSERT INTO calendario (fecha, hora_inicio, hora_fin, id_puesto) VALUES
('2026-07-15', '09:00', '17:00', 2),
('2026-07-15', '17:00', '22:00', 2);

-- LUNES 15/07 (Mantenimiento - Puesto 3)
INSERT INTO calendario (fecha, hora_inicio, hora_fin, id_puesto) VALUES
('2026-07-15', '07:00', '15:00', 3);

-- LUNES 15/07 (Mucama - Puesto 4)
INSERT INTO calendario (fecha, hora_inicio, hora_fin, id_puesto) VALUES
('2026-07-15', '10:00', '18:00', 4),
('2026-07-15', '18:00', '23:00', 4);

-- MARTES 16/07
INSERT INTO calendario (fecha, hora_inicio, hora_fin, id_puesto) VALUES
('2026-07-16', '08:00', '16:00', 1),
('2026-07-16', '09:00', '17:00', 2),
('2026-07-16', '07:00', '15:00', 3),
('2026-07-16', '10:00', '18:00', 4);

-- MIÉRCOLES 17/07
INSERT INTO calendario (fecha, hora_inicio, hora_fin, id_puesto) VALUES
('2026-07-17', '16:00', '23:00', 1),
('2026-07-17', '17:00', '22:00', 2),
('2026-07-17', '08:00', '16:00', 3),
('2026-07-17', '18:00', '23:00', 4);

-- JUEVES 18/07
INSERT INTO calendario (fecha, hora_inicio, hora_fin, id_puesto) VALUES
('2026-07-18', '08:00', '16:00', 1),
('2026-07-18', '09:00', '17:00', 2),
('2026-07-18', '16:00', '23:00', 3),
('2026-07-18', '10:00', '18:00', 4);

-- VIERNES 19/07
INSERT INTO calendario (fecha, hora_inicio, hora_fin, id_puesto) VALUES
('2026-07-19', '08:00', '16:00', 1),
('2026-07-19', '09:00', '17:00', 2),
('2026-07-19', '07:00', '15:00', 3),
('2026-07-19', '18:00', '23:00', 4);

-- SÁBADO 20/07
INSERT INTO calendario (fecha, hora_inicio, hora_fin, id_puesto) VALUES
('2026-07-20', '16:00', '23:00', 1),
('2026-07-20', '17:00', '22:00', 2),
('2026-07-20', '08:00', '16:00', 3),
('2026-07-20', '10:00', '18:00', 4);

-- DOMINGO 21/07
INSERT INTO calendario (fecha, hora_inicio, hora_fin, id_puesto) VALUES
('2026-07-21', '08:00', '16:00', 1),
('2026-07-21', '09:00', '17:00', 2),
('2026-07-21', '16:00', '23:00', 3),
('2026-07-21', '10:00', '18:00', 4);

/* =====================================================
   ASIGNACIÓN HORARIA (Empleados asignados a turnos de la semana)
   ===================================================== */

-- Lunes 15/07: Turnos 1-7
INSERT INTO asignacion_horario (id_empleado, id_calendario)
VALUES
(1, 1), (2, 1),         -- Turno Mozo mañana
(3, 2), (4, 2),         -- Turno Mozo tarde
(5, 3), (6, 3),         -- Turno Cocinero mañana
(7, 4), (8, 4),         -- Turno Cocinero tarde
(9, 5),                 -- Turno Mantenimiento
(10, 6), (11, 6),       -- Turno Mucama mañana
(12, 7), (13, 7);       -- Turno Mucama tarde

-- Martes 16/07: Turnos 8-11
INSERT INTO asignacion_horario (id_empleado, id_calendario)
VALUES
(14, 8), (5, 8),        -- Turno Mozo
(15, 9), (6, 9),        -- Turno Cocinero
(1, 10),                -- Turno Mantenimiento
(16, 11), (2, 11);      -- Turno Mucama

-- Miércoles 17/07: Turnos 12-15
INSERT INTO asignacion_horario (id_empleado, id_calendario)
VALUES
(3, 12), (4, 12),       -- Turno Mozo tarde
(7, 13), (8, 13),       -- Turno Cocinero tarde
(17, 14), (9, 14),      -- Turno Mantenimiento
(10, 15), (11, 15);     -- Turno Mucama tarde

-- Jueves 18/07: Turnos 16-19
INSERT INTO asignacion_horario (id_empleado, id_calendario)
VALUES
(12, 16), (13, 16),     -- Turno Mozo
(15, 17), (6, 17),      -- Turno Cocinero
(18, 18), (1, 18),      -- Turno Mantenimiento tarde
(14, 19), (2, 19);      -- Turno Mucama

-- Viernes 19/07: Turnos 20-23
INSERT INTO asignacion_horario (id_empleado, id_calendario)
VALUES
(5, 20), (16, 20),      -- Turno Mozo
(7, 21), (8, 21),       -- Turno Cocinero
(19, 22),               -- Turno Mantenimiento
(3, 23), (20, 23);      -- Turno Mucama tarde

-- Sábado 20/07: Turnos 24-27
INSERT INTO asignacion_horario (id_empleado, id_calendario)
VALUES
(9, 24), (4, 24),       -- Turno Mozo tarde
(15, 25), (6, 25),      -- Turno Cocinero tarde
(10, 26), (11, 26),     -- Turno Mantenimiento
(12, 27), (13, 27);     -- Turno Mucama

-- Domingo 21/07: Turnos 28-31
INSERT INTO asignacion_horario (id_empleado, id_calendario)
VALUES
(1, 28), (14, 28),      -- Turno Mozo
(5, 29), (6, 29),       -- Turno Cocinero
(17, 30), (18, 30),     -- Turno Mantenimiento
(2, 31), (16, 31);      -- Turno Mucama

/* =====================================================
   HISTORIAL (ejemplo histórico manual)
   ===================================================== */

INSERT INTO asignacion_horario_historial
(empleado_nombre, empleado_apellido, puesto, lugar_trabajo, fecha, hora_inicio, hora_fin)
VALUES
('Juan','Pérez','Mozo','Bar','2025-10-10','08:00','16:00'),
('Carlos','Ruiz','Mantenimiento','Cocina','2025-10-11','07:00','15:00');
