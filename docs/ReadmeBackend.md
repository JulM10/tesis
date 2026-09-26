# Backend – Sistema de Gestión de Empleados y Horarios

API REST desarrollada con Node.js 20, Express 4 y PostgreSQL 16, siguiendo una arquitectura
en capas: **routes → middlewares → controllers → services → queries (SQL puro)**.

---

## Arquitectura

El backend está organizado en módulos por dominio:

```
backend/src/
├── routes/          # Endpoints y HTTP methods
├── middlewares/     # Auth JWT, RBAC, validaciones, multer (CV)
├── controllers/     # Request/response
├── services/        # Lógica de negocio, cifrado/descifrado
├── queries/         # SQL puro parametrizado (sin ORM, sin concatenación)
├── utils/           # cifrado.js, httpError.js, passwordInicial.js
├── database/        # seed-empleados.js (seed cifrado), archivado.js
├── config/          # Conexión PostgreSQL (pool, rol hotel_app)
├── constantes/      # Mensajes centralizados
├── app.js           # Configuración Express (CORS, rutas, 404)
└── server.js        # Entry point
```

Módulos: **auth**, **empleados**, **calendario**, **horarios**, **usuarios**, **me** (autogestión), **catalogos**, **reportes**, **establecimiento**.

---

## Base de Datos

- **PostgreSQL 16** con rol de mínimo privilegio (`hotel_app`: solo DML, sin DDL)
- Esquema normalizado con claves foráneas, CHECKs y UNIQUEs
- **RBAC en tablas:** roles → permisos → usuarios_roles → vista `vw_usuarios_permisos`
- **Vistas SQL:** `vw_empleados_detalle`, `vw_horarios_empleado`, `vw_reporte_historial_horarios`, `vw_reporte_empleados_puesto_lugar`
- **Función:** `fn_horas_trabajadas(desde, hasta)` — turnos y horas agregadas por empleado/puesto
- **Stored procedure:** `archivar_turnos_completados()` — archivado idempotente al historial inmutable
- **Historial inmutable desnormalizado:** `asignacion_horario_historial` guarda nombres/textos (no FKs) — los reportes históricos sobreviven a cambios y bajas
- **Datos personales cifrados:** teléfono, dirección, notas, fecha nacimiento, CV binario (AES-256-GCM en la aplicación)

Principales tablas: `usuarios`, `roles`, `permisos`, `roles_permisos`, `usuarios_roles`, `empleados`, `empleados_cv`, `puestos`, `lugares_trabajo`, `estados`, `calendario`, `asignacion_horario`, `asignacion_horario_historial`.

---

## Docker

```bash
docker compose up --build
```

Para reiniciar la base de datos desde cero:
```bash
docker compose down -v
docker compose up --build
```

El schema y seed se aplican automáticamente al crear el volumen (`docker-entrypoint-initdb.d`). Los empleados del seed se insertan desde `seed-empleados.js` al arrancar el backend (requiere cifrado).

---

## Endpoints

Todos los endpoints (excepto auth) requieren `Authorization: Bearer <token>`. Cada uno valida un permiso específico via RBAC.

### Auth (público)

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/api/auth/login` | Login → `{ token, usuario }`. `usuario.debe_cambiar_password` indica si debe rotar la clave. |
| POST | `/api/auth/renovar` | Renueva el token JWT (requiere token válido). |
| POST | `/api/auth/cambiar-password` | Cambia la contraseña del usuario autenticado. Body: `{ password_actual, password_nueva }` (8+ chars, distinta de la actual). Baja el flag `debe_cambiar_password`. |

### Empleados

| Método | Ruta | Permiso | Descripción |
|---|---|---|---|
| GET | `/api/empleados` | EMPLEADOS_VER | Lista de empleados. |
| GET | `/api/empleados/detalle` | EMPLEADOS_VER | Lista detallada con puesto, lugar, estado (vista `vw_empleados_detalle`). |
| GET | `/api/empleados/:id` | EMPLEADOS_VER | Empleado por ID. |
| POST | `/api/empleados` | EMPLEADOS_CREAR | Crea empleado **y su cuenta** en una transacción (ver abajo). |
| PUT | `/api/empleados/:id` | EMPLEADOS_EDITAR | Actualización parcial con COALESCE (teléfono, dirección, estado, puesto, etc.). |
| DELETE | `/api/empleados/:id` | EMPLEADOS_ELIMINAR | Elimina empleado. |
| POST | `/api/empleados/:id/cv` | EMPLEADOS_EDITAR | Sube CV (PDF/DOCX, máx 5MB). El binario se cifra con AES-256-GCM. |
| GET | `/api/empleados/:id/cv` | EMPLEADOS_VER | Descarga el CV (descifrado al vuelo, nunca URL pública). |
| DELETE | `/api/empleados/:id/cv` | EMPLEADOS_EDITAR | Elimina el CV. |
| GET | `/api/empleados/buscar?q=texto&limite=n` | EMPLEADOS_VER | Autocompletado para asignar turnos: `id`, `nombre`, `apellido` y `puesto` de quienes coinciden. Exige 3 letras (400 si no), devuelve 8 por defecto y 20 como máximo. No toca la vista de detalle ni descifra datos personales. |
| GET | `/api/empleados/:id/licencias?anio` | EMPLEADOS_VER | Licencias del empleado y saldo de vacaciones del año (`dias_anuales`, `usados`, `disponibles`). |
| POST | `/api/empleados/:id/licencias` | EMPLEADOS_EDITAR | Registra una licencia `{ tipo, fecha_desde, fecha_hasta, comentario }`. Tipo `VACACIONES`, `ENFERMEDAD` o `ESPECIAL`. Rechaza superposición con otra licencia (409); las vacaciones además validan el saldo del año y que no haya turnos asignados en el rango. El comentario se guarda cifrado (dato de salud). |
| DELETE | `/api/empleados/:id/licencias/:idLicencia` | EMPLEADOS_EDITAR | Elimina una licencia. |

#### Alta de empleado con provisión automática de cuenta

Al crear un empleado, el backend genera automáticamente su usuario en una transacción:

- **Email** y **DNI** son obligatorios. El email es la identidad de login (UNIQUE en `usuarios`); el DNI se guarda cifrado (solo visualización).
- **Contraseña inicial** derivada: `Nombre + Apellido + últimos 4 dígitos del DNI` (ej. `JuanPerez3456`), normalizada a ASCII.
- La respuesta incluye `password_inicial` **una única vez**. En la BD solo queda el hash bcrypt.
- La cuenta nace con `debe_cambiar_password = true`: obligatorio rotarla en el primer login.

### Usuarios (solo ADMINISTRADOR para mutar)

RRHH tiene solo `USUARIOS_VER` (lectura). La API devuelve 403 si RRHH intenta mutar.

| Método | Ruta | Permiso | Descripción |
|---|---|---|---|
| GET | `/api/usuarios` | USUARIOS_VER | Listado con rol y empleado vinculado. |
| GET | `/api/usuarios/roles` | USUARIOS_VER | Catálogo de roles. |
| POST | `/api/usuarios` | USUARIOS_CREAR | Crea usuario manual (uso limitado; el flujo normal es vía alta de empleado). |
| PUT | `/api/usuarios/:id` | USUARIOS_EDITAR | Edita email, activo y/o id_rol. Email valida formato (400) y unicidad (409). |
| POST | `/api/usuarios/:id/reset-password` | USUARIOS_EDITAR | Genera contraseña temporal aleatoria (se muestra una vez), fuerza cambio. No permite auto-reset. |
| DELETE | `/api/usuarios/:id` | USUARIOS_ELIMINAR | Elimina la cuenta; el empleado vinculado queda con `id_usuario` NULL. |

> Las contraseñas se guardan con hash bcrypt (irreversible): ni un admin con acceso a la BD puede leerlas.

### Me (autogestión del empleado logueado)

La identidad se resuelve desde el token JWT, nunca desde parámetros.

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/me` | Mis datos (perfil + puesto + lugar + estado). |
| GET | `/api/me/horarios` | Mis turnos asignados. |
| PUT | `/api/me` | Editar mis datos de contacto (teléfono, dirección, notas). Nunca puesto/estado. |
| POST | `/api/me/cv` | Subir mi CV (PDF/DOCX, máx 5MB). |
| GET | `/api/me/cv` | Descargar mi CV. |
| GET | `/api/me/licencias` | Mis licencias y saldo de vacaciones (solo lectura). |
| POST | `/api/me/asistencia` | Marca ingreso o salida con el código del kiosco `{ codigo }`. El servidor decide cuál según los turnos de hoy. Código inválido → 400; 5 fallos en 15 min → 429. |

### Asistencia (kiosco)

No usa JWT: el kiosco es un equipo, no un usuario. Se autentica con el header `X-Kiosco-Clave`, que se compara contra la variable `KIOSCO_CLAVE`.

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/asistencia/codigo` | Código de 6 dígitos vigente (`codigo`, `venceEn`, `periodo`). Rota cada 30 s; es un HMAC de la ventana de tiempo, no se guarda. |

Reglas del marcado: el ingreso se acepta desde 30 min antes del inicio hasta el fin del turno; la salida, hasta 60 min después del fin y no antes de 5 min del ingreso. Con una licencia cargada para hoy, se rechaza.

### Calendario

| Método | Ruta | Permiso | Descripción |
|---|---|---|---|
| GET | `/api/calendario` | CALENDARIO_VER | Lista de turnos. |
| GET | `/api/calendario/:id` | CALENDARIO_VER | Turno por ID. |
| GET | `/api/calendario/fecha/:fecha` | CALENDARIO_VER | Turnos de una fecha. |
| GET | `/api/calendario/fecha/:fecha/puesto/:id_puesto` | CALENDARIO_VER | Turnos de una fecha filtrados por puesto. |
| POST | `/api/calendario` | CALENDARIO_CREAR | Crea turno (valida `hora_fin > hora_inicio`). |
| PUT | `/api/calendario/:id` | CALENDARIO_EDITAR | Modifica turno. |
| DELETE | `/api/calendario/:id` | CALENDARIO_ELIMINAR | Elimina turno. |

### Horarios (asignación de empleados a turnos)

| Método | Ruta | Permiso | Descripción |
|---|---|---|---|
| GET | `/api/horarios` | CALENDARIO_VER | Todas las asignaciones. |
| GET | `/api/horarios/empleado/:id` | CALENDARIO_VER | Horarios de un empleado. |
| GET | `/api/horarios/dia/:fecha` | CALENDARIO_VER | Horarios de un día. |
| GET | `/api/horarios/turno/:id` | CALENDARIO_VER | Empleados asignados a un turno. |
| POST | `/api/horarios/asignar` | CALENDARIO_CREAR | Asigna empleado a turno. Valida duplicado y solapamiento con `SELECT FOR UPDATE` (previene race condition). Conflicto → 409. |
| DELETE | `/api/horarios/asignar/:id_empleado/:id_calendario` | CALENDARIO_ELIMINAR | Quita asignación. |
| PUT | `/api/horarios/asignar/:id_empleado/:id_calendario/asistencia` | CALENDARIO_EDITAR | Carga o corrige las marcas `{ hora_ingreso, hora_egreso }` (`null` borra). Solo turnos de hoy o anteriores que todavía no se archivaron, y sin licencia ese día. |

### Catálogos

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/catalogos` | Puestos, lugares de trabajo y estados en un solo request. |

### Reportes

| Método | Ruta | Permiso | Descripción |
|---|---|---|---|
| GET | `/api/reportes/historial?desde&hasta&empleado&puesto&asistencia` | REPORTES_VER | Historial de turnos con filtros, con ingreso, salida, estado de asistencia y horas trabajadas. `asistencia` = `PRESENTE`, `INCOMPLETO`, `AUSENTE`, `ENFERMEDAD` o `LICENCIA`. |
| GET | `/api/reportes/horas?desde&hasta` | REPORTES_VER | Por empleado/puesto: turnos, presentes, sin salida, ausencias, licencias, horas programadas y horas trabajadas. Solo se computan horas con ingreso **y** salida. |
| GET | `/api/reportes/dotacion` | REPORTES_VER | Dotación actual por puesto y lugar. |
| GET | `/api/reportes/dotacion-periodo?desde&hasta` | REPORTES_VER | Por puesto del turno: empleados distintos, turnos y asignaciones en el período (incluye días futuros). Alimenta el gráfico del dashboard. Rango obligatorio, máximo un año. |

### Establecimiento

| Método | Ruta | Permiso | Descripción |
|---|---|---|---|
| POST | `/api/establecimiento/:tipo` | ESTABLECIMIENTO_CREAR | Crea un puesto, lugar de trabajo o estado. `:tipo` = `puestos`, `lugares` o `estados`. |
| PUT | `/api/establecimiento/:tipo/:id` | ESTABLECIMIENTO_EDITAR | Edita nombre del catálogo. |
| DELETE | `/api/establecimiento/:tipo/:id` | ESTABLECIMIENTO_ELIMINAR | Elimina entrada del catálogo. |

---

## Variables de entorno

Ver `backend/.env.example` para la lista completa. Las principales:

| Variable | Descripción |
|---|---|
| `PORT` | Puerto del backend (default: 3000) |
| `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` | Conexión PostgreSQL |
| `DATABASE_URL` | Alternativa para deploy (Railway) |
| `JWT_SECRET` | Secreto para firmar tokens |
| `DATA_ENCRYPTION_KEY` | Clave AES-256 (32 bytes hex) para cifrado de datos personales |
| `CORS_ORIGIN` | Orígenes permitidos, separados por coma |
| `KIOSCO_CLAVE` | Clave del equipo de recepción que muestra el código de asistencia (`/kiosco`) |

---

## Seguridad

- **SQL 100% parametrizado** (`$1, $2…`): cero riesgo de SQL injection.
- **bcrypt** para credenciales (hash irreversible, salt + cost 10).
- **AES-256-GCM** para datos personales (IV aleatorio por registro, detección de adulteración).
- **Rol de BD `hotel_app`** sin DDL: `DROP TABLE` y `CREATE TABLE` fallan con permission denied.
- **Puerto 5432** solo en `127.0.0.1`: Postgres invisible desde la red.
- **CORS restringido** a orígenes declarados en `CORS_ORIGIN`.
- **Multer** con restricción de MIME (PDF/DOCX) y tamaño (5MB) para CVs.
