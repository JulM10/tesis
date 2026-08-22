# Análisis Técnico — Plataforma de Gestión de Empleados Hotel Yacanto

> ## ⚠️ ESTE DOCUMENTO ES UNA FOTO DEL 1 DE JULIO DE 2026 — NO DESCRIBE EL ESTADO ACTUAL
>
> Es la **auditoría inicial**, escrita cuando el proyecto estaba en el commit
> `05103d7`. Se conserva sin reescribir a propósito: es el punto de partida contra
> el cual se mide todo lo que se hizo después.
>
> **Las secciones 1 a 12 describen problemas que en su mayoría ya están resueltos.**
> Para el estado real del proyecto, ir directamente al **§13 "Registro de avances"**
> al final, que sí se mantiene actualizado.
>
> Resumen de qué cambió desde entonces:
>
> | La auditoría decía (1/7) | Estado hoy |
> |---|---|
> | "Avance global ~35-40%" | Todos los módulos del prototipo implementados y desplegados |
> | "no existe autenticación real" | JWT + RBAC por permisos + sesión deslizante con corte por inactividad |
> | "el frontend tiene solo una pantalla" | Ocho pantallas (login, panel, empleados, calendario, usuarios, perfil, reportes, configuración) |
> | Seguridad 2/10 | Cifrado AES-256-GCM de datos personales, rol de BD con mínimo privilegio, CORS restringido, hash bcrypt |
> | "README raíz incorrecto (dice MongoDB)" | Corregido |
> | "sin deploy" | En producción: frontend en Vercel, backend + PostgreSQL en Render |
>
> Lo que sigue pendiente de esa lista original: **tests automatizados y CI** (ítem
> §9.4 y fase P4). Es el gap real que queda.

---

> **Tipo:** Auditoría técnica estilo senior code review
> **Fecha:** 2026-07-01
> **Alcance:** Todo el código fuente (backend + frontend), esquema de BD, Docker, documentación del repo y documento académico de tesis (.docx)
> **Estado del proyecto al momento del análisis:** rama `production`, commit `05103d7` ("creacion login")

---

## 1. Resumen Ejecutivo (al 1/7/2026 — ver banner arriba)

El proyecto es una plataforma web de gestión de RRHH (empleados, turnos, roles) para el Hotel Yacanto, tesis de la carrera Analista en Sistemas. Es un monorepo con backend Node/Express + PostgreSQL (SQL puro) y frontend React 19 + Vite + Tailwind + shadcn/ui.

**Avance global estimado: ~35-40%** medido contra lo que el documento de tesis promete.

Lo más fuerte del proyecto está en la base: el **esquema de base de datos es maduro** (RBAC en tablas, vistas SQL, historial inmutable desnormalizado), el **SQL está 100% parametrizado** (cero riesgo de SQL injection), hay **transacciones reales** con BEGIN/COMMIT/ROLLBACK, y el **entorno es reproducible con un comando** gracias a Docker Compose con init automático de schema y seed.

Lo más débil está en lo visible: **no existe autenticación real** (middlewares vacíos, login mock en frontend), el **frontend tiene solo una pantalla** (login, con un bug que hace fallar hasta el flujo mock), **no hay ni un test**, no hay CI, y el README raíz describe un stack que no es el del proyecto (dice MongoDB; es PostgreSQL).

**Recomendación:** no cambiar de base de datos, no dividir el repo, no sacar Docker. Concentrar el esfuerzo en el orden: auth real → pantallas core (empleados, calendario, dashboard) → reportes → tests/CI/deploy. Con 5-7 semanas de trabajo part-time el proyecto queda en estado defendible.

---

## 2. Scorecard (al 1/7/2026 — desactualizado, ver banner arriba)

| Área | Score | Justificación breve |
|---|:---:|---|
| Arquitectura | 7/10 | Capas limpias y consistentes (routes → controllers → services → queries). Módulos por dominio. |
| Base de datos | 8/10 | Normalizada, RBAC, vistas, historial. Faltan algunos CHECK/UNIQUE. |
| Code Quality | 5/10 | Patrón consistente, pero semántica de errores invertida, endpoint roto, logs con datos. |
| Seguridad | 2/10 | Sin auth implementada, CORS abierto, API pública completa. El diseño (RBAC en BD) existe; la implementación no. |
| Performance | 6/10 | Escala sobra para 35 empleados. Sin N+1 (vistas con JOINs). Sin caching (no lo necesita aún). |
| Testing | 0/10 | Cero tests. Solo colección Postman manual. |
| Documentación | 5/10 | docs/ internos buenos; README raíz **incorrecto** (stack equivocado). |
| DevOps / Deploy | 5/10 | Docker Compose dev excelente; Dockerfile con CMD de desarrollo; sin CI a pesar de que el README la menciona. |
| Escalabilidad | 7/10 | Para el dominio real (10-35 empleados, red interna) sobra por años. |
| **Promedio** | **5.0/10** | Base sólida, ejecución incompleta. |

---

## 3. Stack Tecnológico (versiones exactas)

### Backend (`backend/package.json`)
| Tecnología | Versión | Rol |
|---|---|---|
| Node.js | 20 (alpine, en Dockerfile) | Runtime, ESM (`"type": "module"`) |
| Express | ^4.19.0 | Framework HTTP |
| pg | ^8.16.3 | Driver PostgreSQL (Pool), SQL puro sin ORM |
| cors | ^2.8.5 | CORS (abierto, sin config) |
| dotenv | ^16.4.0 | Variables de entorno |
| nodemon | ^3.1.11 | Dev reload |

### Frontend (`frontend/package.json`)
| Tecnología | Versión | Rol |
|---|---|---|
| React | ^19.2.0 | UI |
| Vite | ^7.2.4 | Build/dev server |
| react-router-dom | ^7.12.0 | Routing |
| Tailwind CSS | ^4.1.18 (plugin @tailwindcss/vite) | Estilos |
| shadcn/ui (Radix: dialog, label, select, slot) | varias | Componentes (instalados, casi sin uso todavía) |
| axios | ^1.13.2 | HTTP client con interceptor de errores |
| sonner | ^2.0.7 | Toasts |
| lucide-react | ^0.562.0 | Íconos |
| ESLint | ^9.39.1 | Lint (flat config) |

### Infraestructura
| Componente | Detalle |
|---|---|
| PostgreSQL | 16 (imagen oficial en docker-compose) |
| Docker Compose | backend + postgres, con init automático: `backend/database/schema.sql` + `seed.sql` montados en `/docker-entrypoint-initdb.d/` |
| CI/CD | **No existe** (el README raíz menciona GitHub Actions, pero no hay carpeta `.github/`) |
| Tests | **No existen** |

---

## 4. Mapa de Arquitectura

```
                         MONOREPO tesis/
   ┌───────────────────────────┐        ┌─────────────────────────────────┐
   │        frontend/          │        │            backend/             │
   │  React 19 + Vite 7        │  HTTP  │  Express 4 (puerto 3000)        │
   │                           │──────▶ │                                 │
   │  src/apis/axios.js        │  JSON  │  src/app.js (cors, json, 404)   │
   │   └─ baseURL hardcodeada  │        │   ├─ /api/empleados             │
   │  src/services/*.js        │        │   ├─ /api/calendario            │
   │  src/pages/login (mock)   │        │   └─ /api/horarios              │
   │  src/router.jsx (solo /,  │        │        │                        │
   │   /login, fallback login) │        │  routes → controllers →         │
   └───────────────────────────┘        │  services → queries (SQL puro)  │
                                        │        │                        │
                                        │  middlewares/                   │
                                        │   ├─ validarEmpleado ✅         │
                                        │   ├─ auth.middleware ❌ VACÍO   │
                                        │   └─ role.middleware ❌ VACÍO   │
                                        └────────┬────────────────────────┘
                                                 │ pg Pool
                                        ┌────────▼────────────────────────┐
                                        │  PostgreSQL 16 (Docker)         │
                                        │  RBAC: roles, permisos,         │
                                        │   usuarios, usuarios_roles      │
                                        │  Negocio: empleados, puestos,   │
                                        │   lugares_trabajo, estados,     │
                                        │   calendario, asignacion_horario│
                                        │  Historial: asignacion_horario_ │
                                        │   historial (inmutable)         │
                                        │  5 vistas (reportes/consultas)  │
                                        └─────────────────────────────────┘
```

Flujo crítico implementado (asignar turno): `POST /api/horarios/asignar` → `asignarTurnoConHistorial` en [horarios.services.js](../backend/src/services/horarios.services.js) → transacción: valida duplicado → valida solapamiento → inserta asignación → inserta historial desnormalizado → COMMIT. Con conflicto responde 409.

---

## 5. Puntos Fuertes (mantener)

1. **SQL 100% parametrizado** (`$1, $2…` en todos los archivos de `backend/src/queries/`). No hay ni una concatenación de strings. SQL injection: cubierto.
2. **Transacción con historial** en `asignarTurnoConHistorial`: BEGIN/COMMIT/ROLLBACK + `client.release()` en `finally`. Es el patrón correcto.
3. **Historial desnormalizado inmutable** (`asignacion_horario_historial` guarda nombre/puesto/lugar como texto): los reportes históricos sobreviven a cambios y bajas de empleados. Decisión de diseño madura y bien justificada en el schema.
4. **RBAC modelado en la base de datos** (roles, permisos, roles_permisos, usuarios_roles + vista `vw_usuarios_permisos`): los permisos se administran con datos, no con código. Solo falta el middleware que lo consuma.
5. **Vistas SQL con comentarios** (5 vistas en [schema.sql](../backend/database/schema.sql)): encapsulan los JOINs, el backend consulta `vw_horarios_empleado` en lugar de repetir joins. Evita N+1 por diseño.
6. **Entorno reproducible**: `docker compose up --build` levanta backend + Postgres con schema y seed cargados automáticamente. Cualquier evaluador puede correr el sistema en minutos.
7. **Separación empleado/usuario** en el modelo: permite empleados sin acceso al sistema (caso real del hotel) y está bien argumentada en la tesis.
8. **Constantes de mensajes centralizadas** ([mensajes.js](../backend/src/constantes/mensajes.js)): sin magic strings en las respuestas.
9. **Seed con casos de borde intencionales** (usuario inactivo, empleado sin usuario, empleado sin horarios): pensado para probar escenarios reales.

---

## 6. Áreas Críticas — Qué está mal implementado

Ordenadas por gravedad.

### 6.1 Seguridad: la API está completamente abierta 🔴
- [auth.middleware.js](../backend/src/middlewares/auth.middleware.js) y [role.middleware.js](../backend/src/middlewares/role.middleware.js) son **archivos en blanco**.
- El login del frontend es un mock: [auth.services.js](../frontend/src/services/auth.services.js) resuelve con `setTimeout` y asigna rol con `email.includes("admin")`.
- No están instalados `bcrypt` ni `jsonwebtoken`. Los hashes del seed son falsos (`$2b$10$fakehashadmin`).
- CORS abierto: `app.use(cors())` en [app.js:11](../backend/src/app.js).
- **Consecuencia:** cualquiera en la red puede crear/borrar empleados y turnos sin credenciales. La tesis promete autenticación, control de sesiones, bloqueo por intentos fallidos y RBAC — nada de eso existe en el código todavía.

### 6.2 Bug: el login falla incluso siendo mock 🔴
[login.jsx:29](../frontend/src/pages/login/login.jsx) llama `onLogin(user)`, pero [router.jsx](../frontend/src/router.jsx) monta `<Login />` **sin la prop** → `onLogin` es `undefined` → TypeError → cae al `catch` → siempre muestra "Credenciales inválidas". Además no hay navegación post-login ni ninguna otra ruta a la cual ir.

### 6.3 Endpoint DELETE de horarios roto 🔴
[horarios.routes.js:34](../backend/src/routes/horarios.routes.js) declara `DELETE /:id`, pero el controller ([horarios.controllers.js:85](../backend/src/controllers/horarios.controllers.js)) lee `req.params.id_empleado` y `req.params.id_calendario`, que **no existen en esa ruta** → llegan `undefined` → el DELETE nunca matchea filas → el service lanza error → responde 500. La ruta debe ser `DELETE /:id_empleado/:id_calendario` (o pasar los IDs por body/query).

### 6.4 Semántica de errores invertida 🟠
- `getAllEmpleados` ([empleados.services.js:5](../backend/src/services/empleados.services.js)) **lanza error si la tabla está vacía** → el cliente recibe 500 "Error interno del servidor". Una lista vacía es `200 []`, no un error. Mismo patrón en `getAllHorarios` y `horariosPorFecha`.
- `getEmpleadoById` lanza `Error` en not-found, pero el controller espera `null` para devolver 404 → el catch lo convierte en 500.
- `updateEmpleado` responde 400 con el mensaje "Error interno" para cualquier fallo, incluido not-found.
- `createCalendario` responde 400 con mensaje de error interno ante cualquier error real de BD.
- **Consecuencia práctica:** el frontend no puede distinguir "no hay datos" de "el servidor explotó", y la demo se rompe en cuanto una tabla está vacía.

### 6.5 Race condition en la asignación de turnos 🟠
La validación de solapamiento en `asignarTurnoConHistorial` es *check-then-insert*: dos requests simultáneas para el mismo empleado pueden pasar ambas la validación y commitear turnos solapados. El `UNIQUE (id_empleado, id_calendario)` solo evita el duplicado exacto, no el solapamiento.
**Fix recomendado (elige uno):**
- Constraint `EXCLUDE USING gist` con `btree_gist` sobre `(id_empleado WITH =, tsrange(fecha+hora_inicio, fecha+hora_fin) WITH &&)` — la BD lo garantiza siempre; o
- `SELECT ... FOR UPDATE` de las asignaciones del empleado dentro de la transacción existente.
Para el contexto real (1-2 administrativos cargando turnos) es improbable, pero la tesis habla explícitamente de "acceso concurrente desde múltiples equipos" — el tribunal puede preguntarlo.

### 6.6 Validaciones faltantes en calendario 🟠
Se puede crear un turno con `hora_fin <= hora_inicio` o sin campos. La tesis (CU02, alternativa 6b: "Horario inválido") promete esta validación. Falta:
- `CHECK (hora_fin > hora_inicio)` en la tabla `calendario`, y/o
- un middleware `validarCalendario` análogo al [validarEmpleado](../backend/src/middlewares/validarEmpleado.middleware.js) que ya existe.
Nota: turnos que cruzan medianoche (23:00–07:00) no están soportados por el modelo actual — documentarlo como limitación conocida.

### 6.7 `updateEmpleado` pisa datos 🟠
[empleados.queries.js:27](../backend/src/queries/empleados.queries.js) hace `SET` de 5 columnas fijas: si el cliente manda solo `nombre`, el resto se escribe como NULL. Además no permite actualizar `telefono`, `direccion` ni `id_estado`, que el modelo sí tiene. Usar `COALESCE($n, columna)` o construir el SET dinámicamente.

### 6.8 Configuración hardcodeada 🟡
- URL del backend fija en [axios.js:4](../frontend/src/apis/axios.js): `http://localhost:3000/api`. Usar `import.meta.env.VITE_API_URL`.
- Conexión pg con variables sueltas (`DB_HOST`, etc.): para Railway conviene soportar `DATABASE_URL` → `new Pool({ connectionString: process.env.DATABASE_URL, ssl: ... })`.
- No existe `backend/.env.example` (el README lo menciona) — un dev nuevo no sabe qué variables definir.
- `docker-compose.yml` con `postgres/postgres` como credenciales (aceptable solo en local).

### 6.9 Logging que filtra datos personales 🟡
`ejecutarQuery` en [horarios.services.js:5-41](../backend/src/services/horarios.services.js) imprime **cada SQL con sus parámetros** por consola. Con datos reales eso registra nombres, teléfonos y direcciones de empleados en logs planos — contradice la sección de la tesis sobre Ley 25.326. Reemplazar por logging condicionado a `NODE_ENV !== 'production'` o un logger con niveles (pino).

### 6.10 Dockerfile con comando de desarrollo 🟡
[backend/Dockerfile](../backend/Dockerfile) termina en `CMD ["npm", "run", "dev"]` (nodemon). Para producción/Railway: `CMD ["npm", "start"]`. Nodemon en producción reinicia el proceso ante cualquier cambio de archivo y consume memoria extra sin beneficio.

### 6.11 README raíz incorrecto 🟡
[README.md](../README.md) dice **MongoDB + Mongoose** (el proyecto usa PostgreSQL + SQL puro), y menciona `models/` (MongoDB), `tests/`, `.env.example` y `.github/workflows` que no existen. Para un tribunal, un README que contradice el código pone en duda todo lo demás. Es el fix de mayor retorno por minuto invertido de todo el proyecto.

### 6.12 Detalles de schema 🟡
- `edad INT` envejece: guardar `fecha_nacimiento DATE` y calcular la edad.
- ✅ **Resuelto (email/DNI):** el empleado ya tiene email (vía su `usuarios.email`, `UNIQUE`) y DNI (cifrado en `empleados.dni`). El alta provisiona la cuenta automáticamente. Duplicados: el **email** sí se detecta (UNIQUE → 409); el **DNI no**, porque el cifrado no determinístico impide `UNIQUE` sobre el valor. Detectar DNI duplicado exigiría un índice ciego (HMAC del DNI) — anotado como trabajo futuro, hoy el DNI es solo dato de ficha.
- `puestos.nombre`, `lugares_trabajo.nombre`, `estados.nombre` sin `UNIQUE`: los catálogos aceptan duplicados.
- Redundancia conceptual entre `usuarios.activo` y `empleados.id_estado` (estados incluye Activo/Inactivo): definir cuál manda y documentarlo.

### 6.13 Frontend: detalles 🟡
- [HorariosTable.jsx](../frontend/src/components/HorariosTable.jsx) no está montado en ninguna ruta (código muerto por ahora), usa `key={index}` y `<table>` HTML plano teniendo instalados los componentes shadcn `Table`.
- `alert()` para errores teniendo `sonner` instalado y el `<Toaster>` ya montado en [App.jsx](../frontend/src/App.jsx).
- Sin rutas protegidas, sin manejo de sesión, sin estado global (Context es suficiente para este tamaño).

---

## 7. Gap Analysis: documento de tesis vs. código real

| Promesa del documento (.docx) | Estado en el código | Prioridad para la defensa |
|---|---|:---:|
| Login con credenciales + hash bcrypt | ❌ Mock en frontend, middlewares vacíos, sin bcrypt | 🔴 P1 |
| Control de sesiones (expiración, tokens) | ❌ No existe | 🔴 P1 |
| Bloqueo tras intentos fallidos | ❌ No existe | 🟡 P1 (mencionable como configuración futura) |
| RBAC Administrador/RRHH/Empleado | ⚠️ Modelado en BD, no aplicado en la API | 🔴 P1 |
| Dashboard con indicadores | ❌ No existe | 🔴 P2 |
| Módulo Calendario semanal con turnos visuales | ❌ No existe (solo API) | 🔴 P2 |
| Módulo Gestión de Empleados (tabla CRUD) | ❌ No existe (solo API) | 🔴 P2 |
| Validación de solapamiento de turnos | ✅ Implementada (con race condition menor) | ✔ |
| Validación "horario inválido" (inicio < fin) | ❌ No implementada | 🟠 P0 |
| Reportes con filtros + export CSV | ⚠️ Vistas SQL listas; sin endpoints, sin CSV, sin UI | 🟠 P3 |
| Auditoría de accesos y cambios | ❌ No existe (el historial de horarios es lo único auditado) | 🟡 P3/futuro — re-alcance en la tesis |
| Backups periódicos | ❌ No hay estrategia (volumen Docker solamente) | 🟡 P4 — documentar procedimiento |
| Ley 25.326 (minimización, acceso restringido) | ⚠️ Contradicha por logs con datos personales y API abierta | 🔴 P1 |
| Acceso concurrente multi-equipo | ⚠️ Funciona, con la race condition señalada | 🟠 P1 |
| Aplicación responsiva | ⚠️ Tailwind presente; solo login construido | 🟠 P2 |
| Diccionario de datos: empleado con email | ✅ Email vía usuarios (UNIQUE) + DNI cifrado; alta unificada | ✔️ |

**Sugerencia estratégica:** lo que no llegues a implementar (auditoría completa, backups automatizados), **re-alcanzalo explícitamente en el documento** como "Trabajo Futuro" en lugar de dejarlo prometido en presente. Un alcance honesto y cumplido defiende mejor que uno amplio e incompleto.

---

## 8. Decisiones estratégicas (consultas respondidas)

### 8.1 ¿Monorepo o dos repos? → **Monorepo**
Un solo desarrollador, features que tocan front y back a la vez, un docker-compose, una historia de commits para mostrar al tribunal. Dividir duplica CI, versionado y sincronización sin ningún beneficio a esta escala. **El deploy no lo requiere:** Vercel (Root Directory = `frontend/`) y Railway (Root Directory = `backend/`) soportan monorepos nativamente y deployan solo cuando cambia su carpeta.

### 8.2 ¿MongoDB en lugar de PostgreSQL? → **No**
El criterio no es "maneja dinero o no", es la forma de los datos. Este dominio es relacional de libro: muchos-a-muchos (`empleados↔calendario`, `usuarios↔roles↔permisos`), integridad referencial, validación de solapamiento, reportes con JOINs/agregaciones y transacciones. Todo eso Postgres lo da nativo y Mongo obligaría a reimplementarlo a mano. Además la FASE 1 (~90% completa, lo mejor del proyecto) y la justificación académica del documento ya están construidas sobre PostgreSQL. Railway ofrece Postgres gestionado en tier gratuito → el objetivo de costo $0 se mantiene. **Migrar sería tirar el mejor trabajo hecho para empeorar el diseño.**

### 8.3 ¿Docker está bien usado? → **Sí, con un ajuste**
El init automático de Postgres (schema + seed montados en `docker-entrypoint-initdb.d`) es de lo más valioso del proyecto: entorno reproducible con un comando, ideal para la demo. Mantenerlo para desarrollo. Único fix: el Dockerfile debe usar `npm start` para producción (hoy corre nodemon). Docker no compite con el plan de deploy: Vercel no lo usa para el frontend y Railway puede usar el Dockerfile o Nixpacks.

### 8.4 Plan de deploy costo $0 (Vercel + Railway)
1. **Railway:** servicio backend con Root Directory `backend/` + plugin PostgreSQL. Soportar `DATABASE_URL` en [database.js](../backend/src/config/database.js). Ejecutar `schema.sql` + `seed.sql` una vez contra la BD de Railway (psql). `CMD npm start`.
2. **Vercel:** proyecto con Root Directory `frontend/`, variable `VITE_API_URL=https://<backend>.railway.app/api`, y usarla en axios.
3. **CORS:** restringir a los dominios de Vercel (`cors({ origin: [...] })`).
4. Advertencias de tier gratuito: Railway funciona con créditos mensuales (el servicio puede dormir/agotarse — verificar el plan vigente), cold starts posibles. Para la defensa, tener también el entorno local con Docker como plan B.

---

## 9. Deuda Técnica (estimaciones)

| # | Ítem | Archivos | Horas |
|---|---|---|:---:|
| 1 | Corregir README raíz (stack real, estructura real) | `README.md` | 0.5 |
| 2 | Crear `backend/.env.example` | nuevo | 0.5 |
| 3 | Arreglar ruta DELETE horarios | `horarios.routes.js`, controller | 1 |
| 4 | Semántica de errores (vacío=200, not-found=404, clases/códigos de error) | services + controllers (3 módulos) | 4-6 |
| 5 | Validación calendario (middleware + CHECK en BD) | nuevo middleware, `schema.sql` | 2 |
| 6 | `updateEmpleado` parcial (COALESCE) + campos faltantes | queries + service | 2 |
| 7 | Logging: quitar SQL+params de consola / logger con niveles | `horarios.services.js` | 1-2 |
| 8 | `VITE_API_URL` + `DATABASE_URL` | `axios.js`, `database.js` | 1 |
| 9 | Dockerfile prod (`npm start`) | `Dockerfile` | 0.5 |
| 10 | CORS restrictivo por entorno | `app.js` | 0.5 |
| 11 | UNIQUEs en catálogos + decisión sobre `edad`/email en empleados | `schema.sql` (+ migración) | 2 |
| 12 | Race condition solapamiento (EXCLUDE o FOR UPDATE) | `schema.sql` o service | 2-3 |
| 13 | Fix bug `onLogin` + navegación post-login | `login.jsx`, `router.jsx` | 1 |
| | **Total deuda actual** | | **~18-22 h** |

---

## 10. Roadmap para terminar y defender la tesis

### P0 — Quick wins (1 día) ✅ alto impacto / bajo esfuerzo
Ítems 1, 2, 3, 5, 7, 9, 10 y 13 de la tabla de deuda. Dejan el repo coherente y la API sin trampas.

### P1 — Autenticación real (FASE 5) — 2-3 días
- `npm i bcrypt jsonwebtoken` en backend.
- `POST /api/auth/login`: valida email+password contra `usuarios`, consulta rol/permisos vía `vw_usuarios_permisos` (ya existe), firma JWT.
- Implementar `auth.middleware.js` (verifica JWT) y `role.middleware.js` (verifica permiso requerido, ej. `EMPLEADOS_CREAR`).
- Proteger todas las rutas; regenerar seed con hashes bcrypt reales.
- Frontend: guardar token (localStorage o memoria), interceptor axios (Authorization header + logout en 401), `ProtectedRoute`, redirección post-login.

### P2 — Frontend core (FASE 4) — 2-3 semanas
- Layout con navegación lateral/superior + contexto de sesión.
- **Módulo Empleados:** tabla CRUD con shadcn `Table` + `Dialog` + `Select` (ya instalados), consumiendo los services existentes en [empleados.services.js](../frontend/src/services/empleados.services.js).
- **Módulo Calendario:** vista semanal, alta de turno, asignación de empleado (manejar el 409 de solapamiento con toast de sonner).
- **Dashboard:** contadores (total empleados, activos, turnos del día) — se resuelven con las vistas SQL existentes.
- Es la fase más larga y la más importante para la demo de la defensa.

### P3 — Reportes (FASE 6) — 1 semana
- Endpoints sobre `vw_reporte_historial_horarios` y `vw_reporte_empleados_puesto_lugar` con filtros (fecha, puesto).
- Export CSV (generar en backend o en frontend desde el JSON).
- Pantalla de reportes con filtros y botón de descarga.

### P4 — QA, CI y deploy (FASE 7) — 1 semana
- Tests: Vitest + supertest para los flujos críticos (asignación con solapamiento, CRUD empleados, login/authz). No hace falta 100% de coverage: cubrir lo que la tesis promete.
- GitHub Actions: lint + tests en cada PR (y recién entonces el README dice la verdad).
- Deploy Vercel + Railway según §8.4. Capturas reales para el documento.
- Ítems 4, 6, 11 y 12 de deuda si quedaron pendientes.
- Actualizar el documento de tesis: re-alcance de auditoría/backups como Trabajo Futuro si no se implementan.

**Total: 5-7 semanas part-time.**

---

## 11. Riesgos principales

1. **Demo de defensa contra servicios gratuitos:** Railway puede dormir el servicio o agotar créditos justo ese día. Mitigación: entorno local con Docker como plan B ensayado.
2. **La tesis promete más de lo que el código hará:** auditoría completa, bloqueo de sesiones, backups. Mitigación: re-alcance explícito en el documento (§7).
3. **Subestimar la FASE 4:** el frontend es ~60% del trabajo restante y es lo único que el tribunal ve en vivo.
4. **Datos personales reales en logs** si se carga información verdadera de empleados antes de arreglar §6.9.
5. **Cambios de esquema tardíos** (email en empleados, EXCLUDE constraint): mientras no haya datos reales, cambiar `schema.sql` es gratis; después del deploy requiere migraciones. Decidir el modelo final **antes** de P2.

---

## 12. Checklist de estado

| Tiene | No tiene |
|---|---|
| ✅ Arquitectura en capas consistente | ❌ Autenticación/autorización implementada |
| ✅ SQL parametrizado en el 100% de las queries | ❌ Tests (unitarios, integración, E2E) |
| ✅ Transacciones en el flujo crítico | ❌ CI/CD (a pesar de mencionarse en README) |
| ✅ RBAC modelado en BD + vistas | ❌ Pantallas de empleados/calendario/dashboard/reportes |
| ✅ Historial inmutable para reportes | ❌ Export CSV |
| ✅ Docker Compose reproducible con seed | ❌ `.env.example` |
| ✅ Validación de solapamiento de turnos | ❌ Validación de datos en calendario |
| ✅ Middleware de validación de empleados | ❌ Manejo de sesión en frontend |
| ✅ Colección Postman | ❌ README raíz correcto |
| ✅ Documentación interna de fases y decisiones | ❌ Estrategia de backups |

---

## 13. Registro de avances

### 2026-07-01 — Autenticación backend (P1 parcial) ✅
- Módulo `auth` completo: `POST /api/auth/login` con bcryptjs + JWT (8h), payload con roles y permisos desde `vw_usuarios_permisos`.
- `auth.middleware.js` (verifica Bearer token) y `role.middleware.js` (`requierePermiso(permiso)`) implementados y aplicados a todas las rutas.
- Seed con hashes bcrypt reales (passwords demo documentadas en `seed.sql`), `backend/.env` + `.env.example`, Postman con login que auto-guarda el token.
- Verificado con 16 pruebas (matriz de permisos admin/RRHH/empleado/sin-rol, tokens inválidos, solapamiento a través del auth).
- **Pendiente de P1:** lado frontend (AuthContext, ProtectedRoute, interceptores).

### 2026-07-01 — Lote estabilización backend ✅
Resueltos los ítems críticos §6.3-6.7, 6.9-6.11 (parcial):
1. **§6.3** Ruta DELETE corregida: `DELETE /api/horarios/asignar/:id_empleado/:id_calendario`.
2. **§6.4** Semántica de errores unificada: `httpError(status, message)` + `responderError` en [utils/httpError.js](../backend/src/utils/httpError.js). Listas vacías → `200 []`; not-found → 404; conflictos → 409; errores de FK → 400 con mensaje claro; los 500 no filtran detalles internos.
3. **§6.6** `validarCalendario` middleware (campos, formatos, `hora_inicio < hora_fin`) + `CHECK chk_calendario_horario_valido` en la BD como respaldo.
4. **§6.7** `updateEmpleado` parcial con `COALESCE` (soporta ahora `telefono`, `direccion`, `id_estado`).
5. **§6.5** Race condition: `SELECT ... FOR UPDATE` sobre el empleado dentro de la transacción (verificado con requests paralelos: exactamente una asignación). Nota: el constraint `EXCLUDE` propuesto originalmente no aplica porque las horas viven en `calendario`, otra tabla.
6. **§6.9** `ejecutarQuery` ya no loguea SQL + parámetros (datos personales); solo el mensaje de error.
7. Healthcheck de Postgres en docker-compose + `depends_on: service_healthy` — el backend ya no crashea al arrancar con volumen nuevo.
8. **§6.11** README raíz corregido (stack real PostgreSQL, estructura real, sección de auth).

### 2026-07-01 — Frontend auth (P1 completado) ✅
Cierra §6.1 (completo), §6.2 y parte de §6.8/§6.13:
1. Login real contra `POST /api/auth/login` — eliminado el mock y el bug de `onLogin`; errores con toast de sonner (adiós `alert()`).
2. `AuthContext` ([context/AuthContext.jsx](../frontend/src/context/AuthContext.jsx)): sesión con `usuario`/`login`/`logout`/`tienePermiso`, persistida en localStorage.
3. `ProtectedRoute` + router reorganizado: `/` (dashboard) protegido, `/login` público, fallback a `/`.
4. Interceptores de axios: request agrega `Authorization: Bearer`; response ante 401 limpia sesión y redirige a `/login`.
5. `VITE_API_URL` con fallback a localhost + `frontend/.env.example` (§6.8 frontend resuelto).
6. Dashboard placeholder con datos del usuario, badges de roles, logout y `HorariosTable` (que dejó de ser código muerto y demuestra el consumo autenticado).
7. Lint en verde: regla `react-refresh/only-export-components` desactivada para `components/ui` (shadcn) y `context`; corregido `__dirname` en `vite.config.js` con `fileURLToPath`.

**Verificado en navegador (end-to-end):** redirección sin sesión, login exitoso → dashboard con datos reales vía JWT, credenciales inválidas rechazadas, logout, y token corrupto → auto-limpieza y redirect. `npm run lint` y `npm run build` en verde.

### 2026-07-04 — Módulo Gestión de Empleados (P2 primer módulo) ✅ (commit `0f46f6f`)
- Backend: módulo `catalogos` (GET /api/catalogos: puestos/lugares/estados), `GET /api/empleados/detalle` sobre la vista `vw_empleados_detalle` ampliada (teléfono, dirección, estado, fecha, ids).
- Frontend: pantalla `/empleados` con tabla shadcn (datos resueltos + badge de estado por color), alta/edición en Dialog con selects de catálogos, borrado con confirmación, botones condicionados por `tienePermiso`. `Layout` compartido con navegación (Inicio/Empleados), sesión y logout.
- Verificado end-to-end en navegador: crear → editar (update parcial conserva puesto/estado) → eliminar → rol EMPLEADO ve la tabla sin botones de acción. Lint y build en verde.
- Nota operativa: Docker Desktop crasheaba al iniciar por un socket huérfano (`%LOCALAPPDATA%\Docker\run\dockerInference`, error "Inference manager"); Windows no permitía borrarlo — se resolvió eliminándolo desde WSL (`wsl -d docker-desktop rm /mnt/host/c/...`). Si reaparece, ese es el procedimiento.

### 2026-07-04 — Módulo Calendario semanal (P2 segundo módulo) ✅ (commit `ade5641`)
- Pantalla `/calendario`: vista semanal lun-dom con navegación de semanas, turnos como bloques (horario + puesto + empleados asignados), filtros por puesto y empleado.
- Crear turno (fecha precargada del día clickeado), asignar/quitar empleados, eliminar turno con confirmación; permisos por rol (EMPLEADO = solo lectura).
- **Fix del corrimiento de fechas UTC en la raíz**: type parser de `pg` devuelve DATE como string `YYYY-MM-DD` + `lib/fechas.js` en frontend (nunca `new Date(iso)`); el dashboard ya muestra 20/11 y no 19/11.
- **Cleanup de queries de solapamiento**: `SelectValidacionHorarios` chequea solo duplicado exacto → cada 409 responde su mensaje correcto ("se superpone" vs "ya está asignado"). Verificado por API y UI.
- `vw_horarios_empleado` expone `calendario_id`.
- Verificado end-to-end en navegador: crear, asignar, solapamiento y duplicado con sus mensajes, quitar asignación, eliminar turno, hora inválida rechazada, rol EMPLEADO sin botones. Lint y build en verde.
- Nota entorno: nodemon dentro del contenedor NO detecta ediciones hechas desde Windows (el mount no propaga eventos de archivos) — tras editar código backend hay que `docker restart hotel-yacanto-backend`.

### 2026-07-04 — Dashboard real (P2 COMPLETO) ✅ (commit `75521e9`)
- Panel `/` con 4 indicadores (total empleados, activos, de vacaciones, turnos de hoy), listas de turnos de hoy y próximos 7 días con asignados, y dotación por puesto (barras) y por estado.
- Todo derivado de endpoints existentes (sin backend nuevo). Eliminado `HorariosTable` (código muerto).
- Verificado E2E: indicadores correctos vs seed (4/3/0), el contador y las listas reaccionan al crear un turno de hoy. Lint y build en verde.
- **Con esto P2 queda cerrado**: los 3 módulos del prototipo de la tesis (Empleados, Calendario, Dashboard) están implementados y verificados.

### 2026-07-05 — Módulo Usuarios + Perfil de empleado + notas ✅ (commit `8cd6dd6`)
- **Módulo usuarios** (cierra el gap "no hay forma de crear usuarios"): CRUD en `/api/usuarios` con alta transaccional (bcrypt + rol + vínculo opcional a empleado sin usuario), activar/desactivar, eliminar (solo ADMIN — RRHH no tiene `USUARIOS_ELIMINAR`, buen ejemplo de RBAC), guards de no auto-eliminarse/desactivarse. Pantalla `/usuarios`.
- **Autogestión** (cierra el gap Ley 25.326): `GET /api/me`, `GET /api/me/horarios`, `PUT /api/me` (teléfono/dirección/notas — nunca puesto/estado). Pantalla `/mi-perfil` con mis datos, "sobre mí" editable y mis turnos.
- **Privacidad** (cierra la contradicción con la tesis): el rol EMPLEADO perdió `EMPLEADOS_VER` — ya no ve teléfonos/direcciones del resto del personal; conserva `CALENDARIO_VER` (dato operativo). Navegación condicionada por permisos; `/` redirige al perfil para empleados.
- **Campo `notas` TEXT** en empleados (descripción/experiencia/referencias), editable por RRHH en `/empleados` y por el propio empleado en su perfil.
- Verificado: 15 pruebas de API + navegador completo. Lint y build en verde.

### 2026-07-06 — CV adjunto por empleado con Supabase Storage ✅ (commit `40d7520`)
- Decisión (Julio): almacenamiento externo; se evaluó Cloudinary y se eligió **Supabase Storage** (bucket privado de fábrica, sin restricción de PDFs en tier gratuito). El proveedor quedó aislado en [storage.services.js](../backend/src/services/storage.services.js) — cambiarlo toca un solo archivo.
- La descarga **siempre** pasa por el backend con RBAC (los CVs son datos personales, Ley 25.326 — nunca URL pública). Subida con multer en memoria: solo PDF/DOCX, máx 5MB.
- Endpoints: `POST/GET/DELETE /api/empleados/:id/cv` (RRHH/admin) y `POST/GET /api/me/cv` (autogestión). UI en el dialog de empleados y en `/mi-perfil`.
- Sin credenciales configuradas responde **503 con mensaje claro** y el resto del sistema no se ve afectado.
- Verificado: 8 pruebas de API + UI end-to-end (falta solo el ciclo real contra Supabase, bloqueado por credenciales).
- **PASO PENDIENTE DE JULIO:** crear proyecto gratuito en supabase.com → crear bucket **privado** llamado `cvs` (Storage → New bucket, sin marcar "public") → copiar Project URL y `service_role` key (Settings → API) a `backend/.env` → `docker restart hotel-yacanto-backend` → probar subir/descargar un PDF real.

### 2026-08-01 — DNI + alta unificada + gestión de cuentas admin-only ✅
- **DNI cifrado** en `empleados.dni` (AES-256-GCM, TEXT). Solo de visualización: el cifrado no determinístico impide UNIQUE/búsqueda (documentado; salida = índice ciego HMAC si hiciera falta).
- **Alta de empleado provisiona la cuenta** en una transacción (usuario + rol EMPLEADO + ficha). Email obligatorio (identidad de login, único en `usuarios`). Contraseña inicial derivada (`Nombre+Apellido+últimos 4 del DNI`), devuelta una vez, con `debe_cambiar_password = true`.
- **Cambio de contraseña**: `POST /api/auth/cambiar-password` (exige la actual, ≥8, distinta) baja el flag. El login expone `debe_cambiar_password`.
- **Gestión de usuarios reservada al ADMINISTRADOR**: se quitó el alta manual; la pantalla es lectura + edición. Admin edita email/rol/estado (`PUT /api/usuarios/:id`) y resetea contraseña a una temporal aleatoria (`POST /api/usuarios/:id/reset-password`, se muestra una vez, fuerza cambio). RRHH quedó con solo `USUARIOS_VER`: la API devuelve 403 a RRHH aunque llame directo (enforcement en backend, no solo UI).
- Verificado: baterías de API (alta, cambio y reset de contraseña, 403 de RRHH, email duplicado/ inválido, no auto-reset) + UI end-to-end en navegador. Build y lint en verde.

**Siguiente:** P3 (reportes CSV sobre `vw_reporte_*`) y P4 (tests + CI + deploy Vercel/Railway — recordar agregar las 3 vars de Supabase en Railway). Pendiente de UI: pantalla de cambio de contraseña forzado que consuma `debe_cambiar_password` (el endpoint ya existe).

**Deuda restante conocida:** `DATABASE_URL` para Railway (§6.8 backend), Dockerfile con CMD dev (§6.10), detalles de schema §6.12 (UNIQUE en catálogos; email/DNI ya resueltos con alta unificada), tests y CI.

**Nota de entorno (recurrente):** Docker Desktop 4.60 crashea al iniciar por sockets AF_UNIX huérfanos que rotan de componente (`dockerInference`, `docker-secrets-engine\engine.sock`), con error "initializing X: listening on unix://...: remove ...: acceso denegado". Ni Windows ni WSL pueden borrar el socket (handle de kernel). Lo que funciona sin reiniciar Windows: **renombrar la carpeta padre** del socket (`Rename-Item %LOCALAPPDATA%\docker-secrets-engine docker-secrets-engine.old`) y relanzar Docker — crea una carpeta nueva limpia. Deshabilitar Docker AI en settings reduce la frecuencia. Observaciones nuevas: (a) `SelectValidacionHorarios` y `VALIDAR_SOLAPAMIENTO_HORARIO` son casi duplicadas (la primera ya detecta solapamiento), por lo que el 409 de solapamiento puede responder el mensaje de "ya asignado" — cleanup menor; (b) `HorariosTable` muestra la fecha corrida un día (`new Date('2025-11-20')` se parsea como UTC y en UTC-3 se ve 19/11) — corregir al construir el módulo Calendario en P2.

*Documento generado como auditoría técnica externa. Actualizarlo al completar cada fase del roadmap (sección 10).*
