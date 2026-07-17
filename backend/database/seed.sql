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
   Los datos personales van CIFRADOS (AES-256-GCM), por lo
   que no pueden insertarse desde SQL plano: los carga el
   backend al arrancar si la tabla está vacía
   (src/database/seed-empleados.js). Ahí también van las
   asignaciones de horario (dependen de los empleados).
   ===================================================== */

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
   ASIGNACIÓN HORARIA: se carga junto con los empleados
   desde el backend (seed-empleados.js), porque depende
   de que los empleados existan (FK).
   ===================================================== */

/* =====================================================
   HISTORIAL (ejemplo histórico manual)
   ===================================================== */

INSERT INTO asignacion_horario_historial
(empleado_nombre, empleado_apellido, puesto, lugar_trabajo, fecha, hora_inicio, hora_fin)
VALUES
('Juan','Pérez','Mozo','Bar','2025-10-10','08:00','16:00'),
('Carlos','Ruiz','Mantenimiento','Cocina','2025-10-11','07:00','15:00');
