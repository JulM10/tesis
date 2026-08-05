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
('CALENDARIO_ELIMINAR'),
('REPORTES_VER');

/* =====================================================
   ROLES → PERMISOS
   ===================================================== */

INSERT INTO roles_permisos
SELECT r.id, p.id
FROM roles r, permisos p
WHERE r.nombre = 'ADMINISTRADOR';

/*
  RRHH gestiona empleados, calendario y reportes, pero la administración
  de CUENTAS (crear/editar/eliminar usuarios, resetear contraseñas, cambiar
  roles) es exclusiva del ADMINISTRADOR. RRHH conserva USUARIOS_VER para
  consultar el listado en modo lectura, pero no los permisos que mutan.
*/
INSERT INTO roles_permisos
SELECT r.id, p.id
FROM roles r
JOIN permisos p ON p.nombre NOT IN ('USUARIOS_CREAR', 'USUARIOS_EDITAR', 'USUARIOS_ELIMINAR')
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
/*
  debe_cambiar_password = false en los usuarios demo: sus passwords son
  conocidas y documentadas acá arriba, se usan para probar la API con
  Postman. Las cuentas que crea el sistema al dar de alta un empleado sí
  nacen con el flag en true (DEFAULT del schema).
*/
INSERT INTO usuarios (email, password_hash, activo, debe_cambiar_password) VALUES
('admin@hotel.com',    '$2b$10$45Q30PUV25yBDDFCUSWF0.ZmocJmoa5LE6ECFhYe3QibPCLi4PZFi', true,  false),
('rrhh@hotel.com',     '$2b$10$k9jtyHf5kVCji88wNESS.Om.yqP8fkxu2cLALd4xbTziYJ3N7/Iya', true,  false),
('empleado@hotel.com', '$2b$10$t7VcEeUniVKpc.fdbVT4k.MNZxwVc7NJAD0ZkNcaBO6ZEocbRjSZ2', true,  false),
('empleado2@hotel.com','$2b$10$6UBLfVdYv0HxtHgWb1POuu4LVG1AzzbF/JIWhhCLjdbnP9vvtjmza', true,  false),
('inactivo@hotel.com', '$2b$10$fTAFEYlxhIxWZRCl2PH.yuaJmNYD46cBek4RZrm7XP8M5MmAEPueW', false, false),
('sinrol@hotel.com',   '$2b$10$Cl2F.3V8KNZe1FwQNbGJBOch2Sk.S8kKoSBiXIyb930hpRSzKCu2C', true,  false);

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
   CALENDARIO (Semana del 01-07 de agosto de 2026)
   ===================================================== */

-- VIERNES 01/08 (Mozo - Puesto 1)
INSERT INTO calendario (fecha, hora_inicio, hora_fin, id_puesto) VALUES
('2026-08-01', '08:00', '16:00', 1),
('2026-08-01', '16:00', '23:00', 1);

-- VIERNES 01/08 (Cocinero - Puesto 2)
INSERT INTO calendario (fecha, hora_inicio, hora_fin, id_puesto) VALUES
('2026-08-01', '09:00', '17:00', 2),
('2026-08-01', '17:00', '22:00', 2);

-- VIERNES 01/08 (Mantenimiento - Puesto 3)
INSERT INTO calendario (fecha, hora_inicio, hora_fin, id_puesto) VALUES
('2026-08-01', '07:00', '15:00', 3);

-- VIERNES 01/08 (Mucama - Puesto 4)
INSERT INTO calendario (fecha, hora_inicio, hora_fin, id_puesto) VALUES
('2026-08-01', '10:00', '18:00', 4),
('2026-08-01', '18:00', '23:00', 4);

-- SÁBADO 02/08
INSERT INTO calendario (fecha, hora_inicio, hora_fin, id_puesto) VALUES
('2026-08-02', '08:00', '16:00', 1),
('2026-08-02', '09:00', '17:00', 2),
('2026-08-02', '07:00', '15:00', 3),
('2026-08-02', '10:00', '18:00', 4);

-- DOMINGO 03/08
INSERT INTO calendario (fecha, hora_inicio, hora_fin, id_puesto) VALUES
('2026-08-03', '16:00', '23:00', 1),
('2026-08-03', '17:00', '22:00', 2),
('2026-08-03', '08:00', '16:00', 3),
('2026-08-03', '18:00', '23:00', 4);

-- LUNES 04/08
INSERT INTO calendario (fecha, hora_inicio, hora_fin, id_puesto) VALUES
('2026-08-04', '08:00', '16:00', 1),
('2026-08-04', '09:00', '17:00', 2),
('2026-08-04', '16:00', '23:00', 3),
('2026-08-04', '10:00', '18:00', 4);

-- MARTES 05/08
INSERT INTO calendario (fecha, hora_inicio, hora_fin, id_puesto) VALUES
('2026-08-05', '08:00', '16:00', 1),
('2026-08-05', '09:00', '17:00', 2),
('2026-08-05', '07:00', '15:00', 3),
('2026-08-05', '18:00', '23:00', 4);

-- MIÉRCOLES 06/08
INSERT INTO calendario (fecha, hora_inicio, hora_fin, id_puesto) VALUES
('2026-08-06', '16:00', '23:00', 1),
('2026-08-06', '17:00', '22:00', 2),
('2026-08-06', '08:00', '16:00', 3),
('2026-08-06', '10:00', '18:00', 4);

-- JUEVES 07/08
INSERT INTO calendario (fecha, hora_inicio, hora_fin, id_puesto) VALUES
('2026-08-07', '08:00', '16:00', 1),
('2026-08-07', '09:00', '17:00', 2),
('2026-08-07', '16:00', '23:00', 3),
('2026-08-07', '10:00', '18:00', 4);

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
