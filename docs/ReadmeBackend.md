# Backend – Sistema de Gestión de Empleados y Horarios

Backend del sistema de gestión de empleados, puestos y horarios.
Desarrollado con Node.js, Express y PostgreSQL, siguiendo una arquitectura
en capas (routes → controllers → services → SQL).

---

## 🧱 Arquitectura

El backend está organizado en módulos por dominio:

- **empleados**
- **calendario**
- **horarios** (asignación de horarios a empleados)

Cada módulo sigue la misma estructura:

---

module/
├── routes/
├── controllers/
├── services/
└── queries/ (opcional)
---

Separación de responsabilidades:
- **Routes**: definen endpoints y HTTP methods
- **Controllers**: reciben la request y devuelven la response
- **Services**: lógica de negocio + acceso a base de datos
- **SQL**: consultas en SQL puro (sin ORM)

---

## 🗄️ Base de Datos

- PostgreSQL 16
- Esquema normalizado
- Uso de claves foráneas
- Uso de vistas para consultas complejas
- Historial inmutable de horarios asignados

Principales tablas:
- usuarios
- empleados
- puestos
- lugares_trabajo
- calendario
- asignacion_horario
- asignacion_horario_historial

---

## 🐳 Docker

El proyecto utiliza Docker para levantar:
- Backend (Node.js)
- Base de datos PostgreSQL

### Comandos principales

```bash
docker compose up --build
```
Para reiniciar completamente la base de datos:
```bash
docker compose down -v
docker compose up --build
```

Endpoints disponibles

## Auth

- POST /api/auth/login → `{ token, usuario }`. `usuario.debe_cambiar_password` indica si la cuenta todavía usa su contraseña inicial.
- POST /api/auth/cambiar-password → rota la contraseña del usuario autenticado y baja el flag `debe_cambiar_password`. Body: `{ password_actual, password_nueva }` (nueva de 8+ caracteres y distinta de la actual).

## Empleados

- GET /api/empleados
- GET /api/empleados/:id
- POST /api/empleados → crea el empleado **y su cuenta de acceso** en una sola transacción (ver más abajo).
- PUT /api/empleados/:id
- DELETE /api/empleados/:id

## Usuarios (solo ADMINISTRADOR para mutar)

La gestión de cuentas es exclusiva del administrador. En el seed, RRHH conserva únicamente `USUARIOS_VER` (lectura); los permisos `USUARIOS_CREAR`, `USUARIOS_EDITAR` y `USUARIOS_ELIMINAR` los tiene solo `ADMINISTRADOR`. Se refuerza en dos capas: el frontend oculta las acciones si no sos admin, y la API responde 403 por falta de permiso.

- GET /api/usuarios → listado con rol y empleado vinculado.
- GET /api/usuarios/roles → catálogo de roles.
- PUT /api/usuarios/:id → edita `email`, `activo` y/o `id_rol` (solo los campos enviados). Email valida formato (400) y unicidad (409).
- POST /api/usuarios/:id/reset-password → genera una contraseña **temporal aleatoria**, la guarda hasheada y fuerza el cambio en el próximo login (`debe_cambiar_password = true`). Devuelve la temporal **una única vez**. No permite resetearse a uno mismo (para eso está el cambio de contraseña).
- DELETE /api/usuarios/:id → elimina la cuenta; el empleado vinculado queda con `id_usuario` en NULL.

> Nota: las contraseñas NO se pueden mostrar. Se guardan con hash bcrypt (irreversible): ni un administrador con acceso a la base puede leerlas. El caso "el usuario olvidó su clave" se resuelve con el reset, no exponiéndola.

### Alta de empleado con provisión automática de cuenta

Al crear un empleado, el backend genera automáticamente su usuario:

- `email` y `dni` son **obligatorios** en el alta. El email es la identidad de login; el DNI aporta los 4 dígitos de la contraseña inicial.
- La contraseña inicial se deriva de los datos del empleado: `Nombre + Apellido + últimos 4 dígitos del DNI` (ej. `JuanPerez3456`), normalizada a ASCII (sin tildes ni ñ).
- La respuesta del alta incluye `password_inicial` **una única vez**: es el único momento en que la contraseña existe en claro. En la BD solo se guarda su hash bcrypt.
- La cuenta nace con `debe_cambiar_password = true`: el usuario está obligado a cambiarla en el primer login.
- El email vive solo en la tabla `usuarios` (fuente de verdad única). No se edita desde el PUT de empleados: se administra en el módulo de usuarios.
- El DNI se almacena cifrado (AES-256-GCM), igual que los demás datos personales. Es solo de visualización: no se puede buscar ni exigir único sobre el valor cifrado.

## Calendario

- GET /api/calendario
- GET /api/calendario/:id
- POST /api/calendario
- PUT /api/calendario/:id
- DELETE /api/calendario/:id

## Horarios

- GET /api/horarios
- GET /api/horarios/empleado/:id
- GET /api/horarios/dia/:fecha
- POST /api/horarios
- DELETE /api/horarios/:id