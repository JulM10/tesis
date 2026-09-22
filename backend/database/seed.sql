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
('REPORTES_VER'),
('ESTABLECIMIENTO_CREAR'),
('ESTABLECIMIENTO_EDITAR'),
('ESTABLECIMIENTO_ELIMINAR');

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

  Lo mismo con ESTABLECIMIENTO_*: definir los puestos y lugares del hotel
  es una decisión de estructura, no de gestión de personal. RRHH los lee
  (GET /api/catalogos solo pide sesión) pero no los modifica.

  Ojo al agregar permisos nuevos: esta consulta otorga TODO lo que no esté
  en la lista de exclusión, así que un permiso nuevo llega a RRHH solo.
*/
INSERT INTO roles_permisos
SELECT r.id, p.id
FROM roles r
JOIN permisos p ON p.nombre NOT IN (
  'USUARIOS_CREAR', 'USUARIOS_EDITAR', 'USUARIOS_ELIMINAR',
  'ESTABLECIMIENTO_CREAR', 'ESTABLECIMIENTO_EDITAR', 'ESTABLECIMIENTO_ELIMINAR'
)
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

INSERT INTO puestos (nombre, color) VALUES
('Mozo',           '#2563eb'),
('Cocinero',       '#ea580c'),
('Mantenimiento',  '#64748b'),
('Mucama',         '#db2777'),
('Administración', '#7c3aed');

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
   CALENDARIO
   Fechas RELATIVAS al día en que se crea la base: tres
   semanas completas, del lunes de la semana pasada al
   domingo de la próxima. Así la demo siempre tiene turnos
   ya cumplidos (el backend los archiva al historial al
   arrancar), turnos de la semana en curso y turnos futuros.
   Las fechas se fijan al crear la base: para moverlas a la
   semana actual hay que recrearla.
   ===================================================== */

INSERT INTO calendario (fecha, hora_inicio, hora_fin, id_puesto)
SELECT dia::date, t.hora_inicio, t.hora_fin, p.id
FROM generate_series(
       date_trunc('week', CURRENT_DATE) - INTERVAL '7 days',
       date_trunc('week', CURRENT_DATE) + INTERVAL '13 days',
       INTERVAL '1 day'
     ) AS dia
CROSS JOIN (VALUES
  ('Mozo',           TIME '08:00', TIME '16:00'),
  ('Mozo',           TIME '16:00', TIME '23:00'),
  ('Cocinero',       TIME '09:00', TIME '17:00'),
  ('Cocinero',       TIME '17:00', TIME '22:00'),
  ('Mantenimiento',  TIME '07:00', TIME '15:00'),
  ('Mucama',         TIME '10:00', TIME '18:00'),
  ('Administración', TIME '08:00', TIME '16:00')
) AS t(puesto, hora_inicio, hora_fin)
JOIN puestos p ON p.nombre = t.puesto
ORDER BY dia, t.hora_inicio, p.id;

/* =====================================================
   ASIGNACIÓN HORARIA: se carga junto con los empleados
   desde el backend (seed-empleados.js), porque depende
   de que los empleados existan (FK).
   ===================================================== */

/* =====================================================
   HISTORIAL (turnos de hace dos semanas)
   Previos al calendario, así el reporte de historial
   muestra algo más que lo archivado automáticamente.
   Carlos Ruiz hoy está Inactivo: su registro muestra que
   el historial conserva a quien ya no trabaja en el hotel.
   ===================================================== */

INSERT INTO asignacion_horario_historial
(empleado_nombre, empleado_apellido, puesto, lugar_trabajo, fecha, hora_inicio, hora_fin,
 estado_asistencia, hora_ingreso, hora_egreso, horas_trabajadas)
VALUES
('Juan',   'Pérez', 'Cocinero',      'Cocina', (date_trunc('week', CURRENT_DATE) - INTERVAL '14 days')::date, '09:00', '17:00',
 'PRESENTE', '08:54', '17:03', 8.00),
('Carlos', 'Ruiz',  'Mantenimiento', 'Cocina', (date_trunc('week', CURRENT_DATE) - INTERVAL '13 days')::date, '07:00', '15:00',
 'PRESENTE', '07:12', '15:01', 7.80);
