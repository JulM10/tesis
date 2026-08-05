# Contexto del Proyecto — Hotel Yacanto RRHH

> **Documento vivo:** Estado del proyecto al 2026-07-26. Resumen técnico, decisiones clave, estado de implementación y roadmap.

---

## 1. Resumen Ejecutivo

**Proyecto:** Plataforma de gestión de RRHH para Hotel Yacanto (tesis, carrera Analista en Sistemas).

**Stack:**
- **Backend:** Node.js + Express 4 + PostgreSQL 16 (SQL puro, sin ORM)
- **Frontend:** React 19 + Vite + Tailwind CSS 4 + shadcn/ui
- **Infraestructura:** Docker Compose (backend + Postgres) + deploy gratuito (Vercel + Railway)

**Estado global:** ~65-70% completo (fase P2 cerrada; P3 en progreso).

**Avances recientes (últimas 3 semanas):**
- ✅ Autenticación JWT + RBAC con 3 roles (ADMIN, RRHH, EMPLEADO)
- ✅ Módulo Empleados (CRUD, edición con selects)
- ✅ Módulo Calendario semanal (visualización, asignación de turnos, validación de solapamientos)
- ✅ Dashboard con indicadores (total, activos, turnos de hoy)
- ✅ Módulo Usuarios (creación, asignación de roles, autogestión limitada)
- ✅ Perfil de empleado (datos personales, teléfono, dirección, notas editables)
- ✅ Encriptación AES-256-GCM para datos personales (teléfono, dirección, notas, fecha nacimiento, CV)
- ✅ CVs almacenados en PostgreSQL (binario cifrado)
- ✅ Reportes backend + archivado automático de turnos
- 🟡 Reportes frontend (endpoint listo, UI pendiente)

**Objetivo inmediato:** Terminar P3 (reportes UI) y P4 (tests + CI + deploy).

---

## 2. Modelo Unificado: Empleados + Usuarios + Roles

### La decisión: unificación de flujo, separación de tablas

**Antes:** dos procesos desacoplados (crear empleado ≠ crear usuario).
**Ahora:** un **flujo unificado** desde una sola interfaz, con dos tablas separadas en la BD.

### Estructura de roles y permisos (RBAC)

| Rol | Descripción | Permisos típicos |
|---|---|---|
| **ADMIN** | Administrador del sistema | Todo: gestión de cuentas (editar email/rol/estado, resetear contraseñas, eliminar), empleados, calendario, reportes |
| **RRHH** | Gestor de RRHH | Empleados, calendario y reportes. Sobre usuarios: **solo lectura** (`USUARIOS_VER`). No crea, edita ni elimina cuentas |
| **EMPLEADO** | Empleado base | Ver su propio perfil, su calendario, **NO** ver datos de otros empleados (privacidad Ley 25.326) |

**Gestión de usuarios (exclusiva del ADMINISTRADOR):**
- No hay alta manual de usuarios: las cuentas se crean con el empleado. La pantalla es lectura + edición.
- El admin puede **editar** email, rol y estado, y **resetear** la contraseña (genera una temporal aleatoria que se muestra una vez y obliga a cambiarla). Las contraseñas nunca se muestran: son hash bcrypt irreversible.
- Enforcement en dos capas: el frontend chequea el rol; el backend, el permiso (RRHH no tiene `USUARIOS_EDITAR/CREAR/ELIMINAR`, así que la API devuelve 403 aunque se la llame directo).

### Tablas clave

```sql
usuarios (id, email, password_hash, activo, ...)
usuarios_roles (usuario_id, rol_id)
roles (id, nombre, descripcion)
roles_permisos (rol_id, permiso_id)
permisos (id, nombre, descripcion)

usuarios (id, email, password_hash, activo, debe_cambiar_password, ...)
empleados (id, nombre, apellido, dni_enc, telefono_enc, direccion_enc, puesto_id, lugar_trabajo_id, estado_id, fecha_nacimiento_enc, notas_enc, ...)
empleados_cv (id_empleado, archivo_enc, nombrearchivo, creado_en)
```

**Invariante clave:** crear un empleado genera automáticamente su usuario, en una sola transacción (usuario + rol EMPLEADO + ficha). Detalles:

- El **email** es obligatorio en el alta y es la identidad de login. Vive solo en `usuarios` (fuente de verdad única); las búsquedas por email usan la vista `vw_empleados_detalle` sobre `idx_usuario_email`.
- El **DNI** es obligatorio en el alta y se guarda cifrado. Aporta los 4 dígitos de la contraseña inicial. Es solo de visualización: al ser el cifrado no determinístico, no se puede buscar ni exigir único.
- La **contraseña inicial** se deriva de los datos del empleado: `Nombre + Apellido + últimos 4 del DNI` (ej. `JuanPerez3456`). Se devuelve una única vez en el alta; en la BD solo queda el hash bcrypt.
- La cuenta nace con `debe_cambiar_password = true`: el login lo expone y el frontend obliga a rotarla (`POST /api/auth/cambiar-password`) antes de operar. Convierte una contraseña débil (4 dígitos secretos) en una credencial de un solo uso.

Ya no existe el alta manual de usuarios: la pantalla de Usuarios quedó como lectura + edición de rol/estado, reservada al **ADMINISTRADOR**.

### El usuario especial: `sinrol@hotel.com`

Existe en el seed para demostrar un principio de seguridad: **"Autenticarse no es estar autorizado."**

- Loguea correctamente contra la API.
- No tiene roles ni permisos explícitos.
- Navega por la UI y ve: navegación vacía, cada módulo negado, cada API devolviendo 403.
- **Valor de defensa:** visualiza en 10 segundos que el sistema niega por defecto, no permite por defecto (deny by default).
- **No tiene empleado asociado:** su gracia es justamente ser la anomalía que demuestra tolerancia ante datos anómalos sin romperse.

---

## 3. Estado Actual: Módulos Implementados

### ✅ Fase P0 — Infraestructura (COMPLETA)
- Docker Compose (backend + Postgres con init automático)
- Schema SQL parametrizado 100%
- Seed con casos de borde (usuarios inactivos, empleados sin usuario, etc.)
- Transacciones reales (BEGIN/COMMIT/ROLLBACK)
- Validación de solapamiento de turnos + race condition con `SELECT FOR UPDATE`

### ✅ Fase P1 — Autenticación (COMPLETA)
- Backend: `POST /api/auth/login` (bcrypt + JWT con roles/permisos)
- `auth.middleware.js` (verifica Bearer token)
- `role.middleware.js` (valida permisos por ruta)
- Frontend: `AuthContext` (contexto de sesión persistida en localStorage)
- `ProtectedRoute` (redirige sin sesión a `/login`)
- Interceptores axios (Authorization header, 401 → logout automático)

### ✅ Fase P2 — Frontend Core (COMPLETA)
**Empleados** (`/empleados`): Tabla CRUD, crear/editar en Dialog, selects de catálogos, borrado con confirmación.
**Calendario** (`/calendario`): Vista semanal, alta de turnos, asignación de empleados, validación de solapamientos con toasts.
**Dashboard** (`/`): 4 indicadores (total, activos, vacaciones, turnos hoy), listas de turnos próximos, dotación por puesto.
**Usuarios** (`/usuarios`): CRUD de usuarios con rol y vínculo a empleado, activar/desactivar, borrado solo para ADMIN.
**Perfil** (`/mi-perfil`): Datos del usuario logueado, mis turnos, edición de contacto/notas, descarga/subida de CV.

### 🟡 Fase P3 — Reportes (PARCIAL)
**Backend completo:**
- Endpoints `GET /api/reportes/historial?desde&hasta&empleado&puesto`
- `GET /api/reportes/horas?desde&hasta`
- `GET /api/reportes/dotacion`
- Vistas SQL: `vw_reporte_historial_horarios`, `vw_reporte_empleados_puesto_lugar`
- Función: `fn_horas_trabajadas(desde, hasta)`
- Archivador automático: `archivar_turnos_completados()` (stored procedure idempotente)

**Frontend pendiente:**
- Pantalla `/reportes` con tabs (Historial, Horas, Dotación)
- Filtros por fecha, empleado, puesto
- Botón descargar CSV

### 🔴 Fase P4 — QA + Deploy (PENDIENTE)
- Tests: Vitest + supertest (rutas críticas: login, CRUD, asignación)
- CI: GitHub Actions (lint + tests en PR)
- Deploy: Vercel (frontend) + Railway (backend con `DATABASE_URL`)
- Variables de entorno: `VITE_API_URL` en Vercel, `DATA_ENCRYPTION_KEY` y `DATABASE_URL` en Railway

---

## 4. Características de Seguridad Implementadas

### 4.1 Encriptación de datos personales (AES-256-GCM)

**Qué se encripta:**
- `empleados.telefono`
- `empleados.direccion`
- `empleados.notas`
- `empleados.fecha_nacimiento`
- `empleados_cv.archivo` (binario)

**Cómo:** Función `cifrar/descifrar` en `backend/src/utils/cifrado.js` (Node.js crypto nativo, cero dependencias). La clave vive en `DATA_ENCRYPTION_KEY` (.env, nunca en la BD).

**Por qué:**
- La BD almacena solo `enc:<iv>:<authTag>:<cifrado>` (texto ilegible).
- GCM (Galois/Counter Mode) es encriptación autenticada: alguien altera un byte en la BD → el desciframiento falla.
- Cumple Ley 25.326 (medidas técnicas proporcionales); un dump robado no expone datos personales.

### 4.2 Credenciales: hash irreversible (bcrypt)

- Almacenamiento: `bcrypt.hash(password, 10)` — salt automático, 2¹⁰ iteraciones.
- Verificación: `bcrypt.compare(inputPassword, hash)`.
- Si roban la BD: las contraseñas nunca se pueden revertir.

### 4.3 Rol de base de datos con mínimo privilegio

- El backend usa `hotel_app` (solo SELECT/INSERT/UPDATE/DELETE).
- Sin DDL: `DROP TABLE`, `CREATE TABLE` fallan con permiso denegado.
- Si comprometen el backend, no pueden alterar el esquema.

### 4.4 Defensa en profundidad

1. RBAC en la app (permisos por rol)
2. Rol de BD con mínimos privilegios
3. Encriptación de datos personales
4. Hash de credenciales

Las cuatro capas son independientes; comprometer una no rinde las demás.

---

## 5. Decisiones Arquitectónicas Defendibles

### 5.1 Monorepo vs. dos repos → **Monorepo**

**Argumentación:**
- Un solo desarrollador, features que tocan front y back a la vez.
- Un docker-compose y una historia de commits limpia.
- Deploy no lo requiere: Vercel (Root Directory `frontend/`) y Railway (Root Directory `backend/`) soportan monorepos.

### 5.2 PostgreSQL vs. MongoDB → **PostgreSQL**

**Argumentación:**
- Dominio relacional: empleados ↔ calendarios ↔ roles (muchos-a-muchos).
- Integridad referencial, validación de solapamiento, reportes con JOINs.
- Vistas SQL encapsulan lógica; el backend queda trivial.
- Railway ofrece Postgres en tier gratuito.

### 5.3 CVs en PostgreSQL (BYTEA) vs. Supabase Storage → **PostgreSQL**

**Argumentación (actual):**
- Demo autocontenida: sin servicio externo que pueda estar caído el día de la defensa.
- Escala: 20 empleados × 5MB máx = 100MB (BYTEA admite hasta 1GB).
- Consistencia: sin archivos huérfanos; `ON DELETE CASCADE` del empleado elimina su CV.
- Archivos **nunca** se sirven por URL pública; siempre pasan por backend con RBAC.

**Mejora a futuro (documentada):** A mayor escala, el binario iría a S3/Cloudflare R2. Migración toca solo 3 queries de CV — decisión **reversible**.

### 5.4 Vistas SQL para reportes y acceso → **Vistas sí**

- Encapsulan JOINs complejos en la BD.
- El backend consulta `vw_empleados_detalle` en lugar de escribir manualmente los JOINs.
- Evita N+1 por diseño y permite cambios internos (ej.: migración CV Supabase → Postgres) sin tocar la API.

### 5.5 Historial desnormalizado → **Así es**

- Tabla `asignacion_horario_historial` copia `nombre`, `puesto`, `lugar` como texto (no FKs).
- **Razón:** un reporte histórico no debe cambiar si después renombran el puesto o eliminan al empleado.
- **Inmutabilidad intencional:** los registros históricos son auditables y estables.

---

## 6. Seguridad de la Presentación (Defensa)

### Fixture `sinrol@hotel.com` para demostrar "deny by default"

**Demo en vivo (5 minutos):**
1. Loguea con `sinrol@hotel.com` / password.
2. Navega por la UI: cada módulo muestra "Acceso denegado".
3. Abre DevTools → Network, intenta llamar a una API.
4. Respuesta: 403 Forbidden (sin manejo de RBAC, sería 200 con datos).

**Frase para el tribunal:** "Autenticarse no es estar autorizado. Sin permisos explícitos, el sistema niega por defecto, no permite por defecto."

### Datos personales: Ley 25.326

- **No cifrar nombres:** son datos de bajo riesgo, necesarios para operar (listas, búsquedas).
- **Cifrar teléfono/dirección:** datos sensibles de contacto privado.
- **Edad derivada, no almacenada:** `EXTRACT(YEAR FROM age(fecha_nacimiento))` en cada consulta — nunca desactualizada.
- **Derecho de rectificación:** el empleado puede editar sus datos en `/mi-perfil` (teléfono, dirección, notas — nunca puesto/estado, eso es de RRHH).

---

## 7. Tareas Pendientes (Ordenadas por Prioridad)

### P3 — Reportes (FRONTERA, 2-3 horas)

**Pendiente:**
- [ ] Pantalla `/reportes` con 3 tabs: "Historial de turnos", "Horas trabajadas", "Dotación"
- [ ] Filtros por fecha (desde/hasta), empleado (nombre), puesto
- [ ] Tabla de resultados con shadcn `Table`
- [ ] Botón "Descargar CSV" que consume `descargarCSV` (ya existe en `reportes.services.js`)

**Archivos a tocar:**
- Nueva ruta en `frontend/src/router.jsx` → `/reportes`
- Nueva página `frontend/src/pages/reportes/reportes.jsx` (existe pero está fuera del router; sacarla de comentarios y conectarla)
- El backend ya sirve los endpoints; solo falta UI.

### P4 — Tests + CI + Deploy (1-2 semanas)

**Tests:**
- [ ] Vitest + supertest en backend: login, CRUD empleados, asignación de turnos con solapamiento
- [ ] E2E en frontend con Playwright (login → crear empleado → asignar turno)

**CI:**
- [ ] GitHub Actions: lint + tests en cada PR

**Deploy:**
- [ ] Vercel: frontend con `VITE_API_URL=https://<backend>.railway.app/api`
- [ ] Railway: backend con `DATABASE_URL`, `DATA_ENCRYPTION_KEY`, seed ejecutado una sola vez
- [ ] Validar CORS restringido a dominios de Vercel

### Deuda técnica menor (si quedó pendiente)

- [x] DNI en empleados (cifrado) y email vía usuarios: implementado. Alta unificada con provisión automática de cuenta y `debe_cambiar_password`.
- [ ] UNIQUE en catálogos (puestos, lugares, estados) si no se implementó.
- [ ] Detalle de backups automatizados (hoy: `npm run db:backup` manual).
- [ ] Dockerfile con `npm start` para producción (ahora usa dev nodemon).

---

## 8. Roadmap Sugerido para Finalizar

### Semana 1: P3 → Reportes UI (2-3 horas)
1. Conectar `/reportes` al router.
2. Construir filtros y tabla (shadcn Table).
3. Botón CSV funcional.
4. Verificar en navegador end-to-end.

### Semana 2: P4 → Tests + CI
1. Tests críticos (bcrypt, login, CRUD).
2. GitHub Actions: lint en PR (sin test runner todavía si hay presión de tiempo).
3. Documento de tesis finalizado.

### Semana 3: Deploy
1. Railway: backend + `DATABASE_URL`.
2. Vercel: frontend + `VITE_API_URL`.
3. Capturas de la defensa en producción.

---

## 9. Credenciales de Demo (Seed)

```sql
-- ADMIN
email: admin@hotel.com
password: AdminPass123

-- RRHH
email: rrhh@hotel.com
password: RRHHPass123

-- Empleado
email: empleado@hotel.com
password: EmpleadoPass123

-- Sin rol (deny by default)
email: sinrol@hotel.com
password: SinrolPass123

-- Inactivo (no loguea)
email: inactivo@hotel.com
password: (irrelevante)
```

---

## 10. Archivos Clave del Proyecto

```
tesis/
├── backend/
│   ├── src/
│   │   ├── app.js (Express, rutas, CORS)
│   │   ├── server.js (escucha puerto 3000)
│   │   ├── config/database.js (pg Pool)
│   │   ├── middlewares/
│   │   │   ├── auth.middleware.js (verifica JWT)
│   │   │   └── role.middleware.js (valida permisos)
│   │   ├── routes/ (empleados, calendario, horarios, usuarios, auth, reportes)
│   │   ├── controllers/ (lógica de request/response)
│   │   ├── services/ (lógica de negocio + cifrado)
│   │   ├── queries/ (SQL puro)
│   │   ├── utils/
│   │   │   ├── cifrado.js (encriptación AES-256-GCM)
│   │   │   └── httpError.js (errores uniformes)
│   │   └── constantes/mensajes.js (strings centralizados)
│   ├── database/
│   │   ├── schema.sql (tablas, vistas, funciones, stored procedures)
│   │   └── seed.sql (datos iniciales)
│   ├── Dockerfile (Node 20 alpine)
│   ├── docker-compose.yml (backend + postgres)
│   └── package.json (bcryptjs, express, jsonwebtoken, pg, multer, dotenv)
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx (layout root, Toaster)
│   │   ├── main.jsx (ReactDOM)
│   │   ├── router.jsx (rutas: /, /login, /empleados, /calendario, etc.)
│   │   ├── context/AuthContext.jsx (sesión global)
│   │   ├── pages/
│   │   │   ├── login/login.jsx
│   │   │   ├── dashboard/dashboard.jsx (indicadores e info)
│   │   │   ├── empleados/empleados.jsx (CRUD)
│   │   │   ├── calendario/calendario.jsx (semanal)
│   │   │   ├── usuarios/usuarios.jsx (gestión de usuarios)
│   │   │   ├── perfil/perfil.jsx (autogestión)
│   │   │   └── reportes/reportes.jsx (pendiente de conectar)
│   │   ├── components/
│   │   │   ├── Layout.jsx (navegación, sesión)
│   │   │   ├── ProtectedRoute.jsx
│   │   │   └── ui/ (shadcn: button, input, dialog, table, select)
│   │   ├── services/
│   │   │   ├── auth.services.js (login real)
│   │   │   ├── empleados.services.js (CRUD)
│   │   │   ├── calendario.services.js (turnos)
│   │   │   ├── usuarios.services.js
│   │   │   ├── reportes.services.js (fetch reportes)
│   │   │   └── ...
│   │   ├── apis/axios.js (cliente HTTP con interceptores)
│   │   ├── lib/fechas.js (helpers de formato)
│   │   └── ...
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── eslint.config.js
│   └── package.json (react, vite, axios, sonner, lucide-react, shadcn)
│
├── docs/
│   ├── ANALISIS-TECNICO.md (scorecard, gaps, deuda, roadmap original)
│   ├── defensa.md (argumentos para el tribunal)
│   ├── analisis-cv-postgres.md (decisión de almacenamiento)
│   ├── pasos-a-presentar.md (guión de demostración)
│   ├── PorSiMeOlvido.md (notas técnicas)
│   ├── ResolucionesTecnicas.md (decisiones pequeñas)
│   ├── ReadmeBackend.md
│   ├── backups.md (estrategia de respaldos)
│   └── contexto-para-claude.md (ESTE ARCHIVO)
│
├── docker-compose.yml (definición de servicios)
├── .gitignore
├── .env.example (backend)
└── README.md (stack correcto: Node + React + PostgreSQL + Docker)
```

---

## 11. Comandos Usuales

```bash
# Desarrollo local
docker compose up --build

# Logs
docker logs hotel-yacanto-backend
docker logs hotel-yacanto-postgres

# Backend solo
cd backend
npm run dev          # con nodemon

# Frontend solo
cd frontend
npm run dev          # Vite dev server (puerto 5173)
npm run build
npm run lint

# Base de datos
npm run db:backup    # backup comprimido
npm run db:restore   # restaurar desde último backup

# Acceso directo a Postgres
docker exec -it hotel-yacanto-postgres psql -U postgres -d hotel_yacanto
```

---

## 12. Notas Operativas

### Problema recurrente: Docker Desktop con sockets huérfanos

**Síntoma:** Docker Desktop no inicia; error "initializing dockerInference: listening on unix://...".
**Causa:** Socket AF_UNIX huérfano que Windows/WSL no pueden eliminar.
**Solución (sin reiniciar Windows):**
```powershell
Rename-Item $env:LOCALAPPDATA\docker-secrets-engine docker-secrets-engine.old
# Relanzar Docker Desktop
```

### Nodemon no detecta cambios en backend desde Windows

**Síntoma:** Editas código en `backend/src/`, pero nodemon no lo reinicia.
**Causa:** El mount de Docker no propaga eventos de archivo desde Windows.
**Solución:**
```bash
docker restart hotel-yacanto-backend
```

### Fecha UTC corrida un día en frontend

**Resuelto:** Jamás hacer `new Date('2026-11-20')` (se parsea como UTC, se muestra en UTC-3 → corrida). Usar strings ISO y librerías como `lib/fechas.js` que no instancian Date.

---

## 13. Próximas Acciones (Julio — TÚ)

### Inmediatas (hoy/mañana)
1. **Conectar `/reportes` al router** (sacar del comentario en `router.jsx`).
2. **Verificar que `reportes.jsx` existe y carga** (sin errores de import).

### Esta semana
3. **Terminar UI de reportes** (3 tabs, filtros, tabla, CSV).
4. **Verificar reportes end-to-end** en navegador.

### Próximas dos semanas
5. **Tests básicos** (bcrypt, login, CRUD).
6. **CI con GitHub Actions** (lint en PR).

### Antes de la defensa
7. **Deploy en Railway + Vercel** (capturas de producción).
8. **Ensayo de demo** (todos los flujos en vivo).

---

## 14. Contacto y Referencias

**Documento de tesis:** [enlace local a archivo .docx si existe]
**Análisis técnico completo:** `docs/ANALISIS-TECNICO.md`
**Argumentos para la defensa:** `docs/defensa.md`
**Demostración paso a paso:** `docs/pasos-a-presentar.md`
**Backups:** `docs/backups.md`

---

**Última actualización:** 2026-07-26
**Estado:** P3 frontera (UI reportes pendiente) → P4 (tests + deploy).
**Confianza de defensa:** 85% (core de dominio implementado, UI secundaria en progreso).
