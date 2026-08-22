# Contexto del Proyecto — Hotel Yacanto RRHH

> **Documento vivo.** Última verificación contra el código: **2026-08-22**.
> Sirve como puesta al día rápida del estado del proyecto.
>
> Fuentes de verdad cuando haya dudas: el código, `docs/defensa.md` (argumentos
> para el tribunal) y `docs/ANALISIS-TECNICO.md` §13 (registro de avances).

---

## 1. Qué es

Plataforma web de gestión de RRHH para el Hotel Yacanto (Traslasierras, Córdoba).
Tesis de Analista en Sistemas. El hotel tiene ~10 empleados en temporada baja y
~35 en alta, con PCs compartidas en red interna.

**Stack:** monorepo. Backend Node 20 + Express 4 + PostgreSQL 16 con SQL puro
(sin ORM), en capas `routes → middlewares → controllers → services → queries`.
Frontend React 19 + Vite + Tailwind 4 + shadcn/ui. Docker Compose para desarrollo.

**Estado: en producción y funcionando.**
- Frontend: Vercel
- Backend + PostgreSQL: Render
- El backend se conecta como `hotel_app`, no como el usuario dueño que da Render

**Lo único grande que falta: tests automatizados y CI.**

---

## 2. Modelo de datos y RBAC

### Empleados y usuarios: tablas separadas, alta unificada

Son dos tablas, pero **un solo flujo**: crear un empleado genera automáticamente su
cuenta, en una sola transacción (usuario + rol EMPLEADO + ficha). Ya no existe el
alta manual de usuarios en la interfaz.

- **Email:** obligatorio, es la identidad de login. Vive solo en `usuarios`
  (fuente de verdad única); las búsquedas usan la vista `vw_empleados_detalle`.
- **DNI:** obligatorio y **cifrado**. Aporta los 4 dígitos de la contraseña inicial.
  Es solo de visualización: al no ser determinístico el cifrado, no se puede buscar
  ni exigir único.
- **Contraseña inicial:** derivada de los datos del empleado
  (`Nombre + Apellido + últimos 4 del DNI`, ej. `JuanPerez3456`). Se devuelve una
  única vez en el alta; en la BD solo queda el hash bcrypt.
- **`debe_cambiar_password = true`** al nacer la cuenta: el login lo expone y el
  frontend obliga a rotarla antes de operar. Convierte una contraseña débil en una
  credencial de un solo uso.

### Roles

| Rol | Alcance |
|---|---|
| **ADMINISTRADOR** | Todo: cuentas (editar email/rol/estado, resetear contraseñas, eliminar), empleados, calendario, reportes y estructura del establecimiento |
| **RRHH** | Empleados, calendario y reportes. Sobre usuarios: **solo lectura**. No administra la estructura del establecimiento |
| **EMPLEADO** | Su propio perfil y el calendario. **No** ve datos personales de otros (Ley 25.326) |

⚠️ **Al agregar un permiso nuevo:** el seed le otorga a RRHH *todo lo que no esté
en su lista de exclusión*. Un permiso nuevo le llega solo salvo que lo excluyas
explícitamente en `seed.sql`.

### Tablas principales

```sql
usuarios (id, email, password_hash, activo, debe_cambiar_password, ...)
usuarios_roles (id_usuario, id_rol)
roles / permisos / roles_permisos          -- RBAC en datos, no en código

empleados (id, id_usuario, nombre, apellido, dni*, fecha_nacimiento*,
           telefono*, direccion*, notas*, id_puesto, id_lugar, id_estado, ...)
empleados_cv (id_empleado PK/FK, archivo*, nombre_archivo, ...)

puestos / lugares_trabajo / estados        -- catálogos, nombre UNIQUE
calendario (id, fecha, hora_inicio, hora_fin, id_puesto)
asignacion_horario (id_empleado, id_calendario)
asignacion_horario_historial (...)         -- desnormalizado e inmutable
```
`*` = cifrado con AES-256-GCM en la capa de aplicación.

### `sinrol@hotel.com` — fixture de seguridad

Usuario del seed que **loguea correctamente pero no tiene ningún permiso**. No es un
descuido: es la demostración en vivo de *deny by default*. Navega y ve navegación
vacía, cada módulo negado y cada API devolviendo 403.

> "Autenticarse no es estar autorizado. Un usuario válido sin permisos explícitos no
> ve nada: el sistema niega por defecto, no permite por defecto."

No tiene empleado asociado a propósito — su gracia es ser la anomalía, y demuestra
además que el sistema tolera datos anómalos sin romperse.

---

## 3. Módulos implementados

Ocho pantallas, todas funcionando:

| Ruta | Qué hace |
|---|---|
| `/login` | Login real contra `POST /api/auth/login` |
| `/` | Panel: indicadores (total, activos, vacaciones, turnos de hoy), turnos próximos, dotación por puesto, cumpleaños, antigüedad |
| `/empleados` | CRUD completo con Dialog, selects de catálogos, CV adjunto, borrado con confirmación |
| `/calendario` | Vista semanal, alta de turnos, asignar/quitar empleados, validación de solapamiento |
| `/usuarios` | **Lectura + edición** (email, rol, estado) y reseteo de contraseña. Solo ADMINISTRADOR. **No hay alta manual**: las cuentas nacen con el empleado |
| `/mi-perfil` | Autogestión: datos propios, mis turnos, edición de contacto/notas, CV |
| `/reportes` | Tres reportes (historial, horas trabajadas, dotación) con filtros y descarga CSV |
| `/configuracion` | ABM de puestos y lugares de trabajo. Solo ADMINISTRADOR |

### Backend: endpoints por módulo

`/api/auth` (login, cambiar-password, renovar) · `/api/empleados` (+ detalle, + CV) ·
`/api/usuarios` (+ roles, + reset-password) · `/api/me` (autogestión) ·
`/api/calendario` · `/api/horarios` · `/api/catalogos` · `/api/reportes` ·
`/api/establecimiento`

La colección de Postman (`postman.json`, 42 requests en 9 carpetas) los cubre todos.

### En la base de datos

- **Vistas:** `vw_empleados_detalle`, `vw_horarios_empleado`, `vw_usuarios_permisos`,
  `vw_reporte_historial_horarios`, `vw_reporte_empleados_puesto_lugar`
- **Función:** `fn_horas_trabajadas(desde, hasta)` — agregación por rango
- **Procedimiento:** `archivar_turnos_completados()` — idempotente, se invoca al
  arrancar el backend y copia turnos pasados al historial inmutable

---

## 4. Seguridad

### Cifrado de datos personales (AES-256-GCM en la aplicación)

Se cifran `dni`, `fecha_nacimiento`, `telefono`, `direccion`, `notas` y el binario
del CV. La BD solo ve `enc:<iv>:<authTag>:<cifrado>`.

- Implementado en `backend/src/utils/cifrado.js` con el `crypto` nativo de Node,
  cero dependencias. La clave vive en `DATA_ENCRYPTION_KEY` y **nunca llega a
  Postgres** (a diferencia de pgcrypto, donde viajaría en cada consulta SQL).
- **GCM es cifrado autenticado:** si alguien altera bytes en la BD, el `authTag` no
  valida y el descifrado falla en vez de devolver basura. Mapea directo al art. 9 de
  la Ley 25.326, que pide evitar la adulteración y *detectar desviaciones*.
- IV aleatorio por registro: dos teléfonos iguales generan cifrados distintos.
- **Nombre y apellido quedan en claro** por proporcionalidad: son necesarios para
  listar y buscar, y no son datos sensibles según el art. 2.

**Consecuencia de diseño:** como SQL ya no puede leer `fecha_nacimiento`, la **edad
se calcula en Node después de descifrar**, no en la vista.

### Credenciales

`bcrypt.hash(password, 10)` — salt automático y ~100 ms por intento. Irreversible:
una contraseña solo necesita verificarse, nunca recuperarse.

### Sesión deslizante (dos controles distintos)

- **El JWT dura 15 minutos.** Limita cuánto sirve un token robado.
- **El frontend corta a los 10 minutos sin actividad**, con aviso y cuenta regresiva
  en el último minuto (`components/ControlDeSesion.jsx`). Protege la PC compartida
  que queda desatendida.
- **Mientras hay actividad**, si al token le quedan menos de 7 minutos se renueva en
  silencio contra `POST /api/auth/renovar`. Quien está trabajando no se entera.

Ese endpoint **relee roles y permisos de la BD y rechaza cuentas desactivadas**, lo
que da dos cosas: un cambio de permisos aplica en ≤15 min sin re-login, y dar de baja
a un usuario le corta el acceso en ≤15 min. Es la ventana de revocación de un JWT sin
estado.

### Mínimo privilegio en la base

El backend se conecta como `hotel_app`: solo SELECT/INSERT/UPDATE/DELETE, **sin DDL**.
Si comprometen el backend, no pueden alterar ni destruir el esquema. Vale también en
producción: en Render se creó ese rol en vez de usar el usuario dueño.

### Defensa en profundidad

Cuatro capas independientes: RBAC en la app · rol de BD con mínimos privilegios ·
cifrado de datos personales · hash de credenciales. Comprometer una no rinde las demás.

---

## 5. Decisiones arquitectónicas (no re-litigar)

**Monorepo.** Un solo desarrollador, features que tocan front y back a la vez, un
docker-compose, una historia de commits. Vercel y Render soportan monorepos con
Root Directory.

**PostgreSQL, no MongoDB.** El dominio es relacional de libro: muchos-a-muchos
(`empleados↔calendario`, `usuarios↔roles↔permisos`), integridad referencial,
validación de solapamiento, reportes con JOINs y transacciones.

**CVs en PostgreSQL (BYTEA), no en storage externo.** Se migró desde Supabase a
propósito: demo autocontenida sin servicios externos que puedan estar caídos o
pausados el día de la defensa. Escala real: 20 empleados × 5 MB = 100 MB peor caso.
Tabla separada con `PK = FK` y `ON DELETE CASCADE`, así los listados no arrastran
binarios. La salida a S3/R2 toca solo 3 queries — reversible y barato.

**Vistas SQL.** Encapsulan los JOINs; el backend queda trivial. Permitieron cambiar
el storage del CV sin tocar el frontend.

**Historial desnormalizado a propósito.** `asignacion_horario_historial` guarda
nombres y textos, no FKs: un reporte histórico no debe cambiar si después renombran
un puesto o eliminan al empleado. Además, como guarda nombres en claro (dato
proporcional), los reportes se resuelven 100% en SQL a pesar del cifrado.

**Docker Compose en desarrollo, servicios gestionados en producción.** No es una
inconsistencia: en producción la base es un servicio con backups y alta
disponibilidad propios; replicar el contenedor sería peor. El Dockerfile del backend
sí se reusa tal cual.

**Los estados del personal NO se administran desde la UI.** Sus nombres están
acoplados a la lógica del frontend (el panel lee `porEstado["Activo"]`, los badges
se colorean por nombre). Renombrarlos en caliente rompería esas pantallas en
silencio. Se muestran como badges de solo lectura, con la explicación a la vista.

---

## 6. Lo que falta

1. **Tests automatizados y CI** — el gap real. Nada de Vitest/supertest todavía,
   ni GitHub Actions.
2. **Horarios fijos** — hoy un empleado no puede tener "lunes a viernes 5 h" sin
   cargar ~260 turnos. Análisis con dos soluciones en `docs/analisis-horarios-fijos.md`;
   la recomendada es el template semanal + excepciones (2-3 días). **Esperando decisión.**
3. **Backups automatizados** — hoy `npm run db:backup` es manual.

---

## 7. Credenciales de demo

Fuente de verdad: [seed.sql](../backend/database/seed.sql). Todas con
`debe_cambiar_password = false`.

| Email | Password | Caso |
|---|---|---|
| `admin@hotel.com` | `Admin123!` | ADMINISTRADOR |
| `rrhh@hotel.com` | `Rrhh123!` | RRHH (sin gestión de cuentas) |
| `empleado@hotel.com` | `Empleado123!` | EMPLEADO |
| `empleado2@hotel.com` | `Empleado123!` | EMPLEADO (segundo, para pruebas) |
| `inactivo@hotel.com` | `Inactivo123!` | No puede loguear (`activo = false`) |
| `sinrol@hotel.com` | `Sinrol123!` | Loguea sin permisos (deny by default) |

---

## 8. Estructura del repo

```
tesis/
├── backend/
│   ├── src/
│   │   ├── app.js            Express, CORS por entorno, montaje de rutas
│   │   ├── server.js         arranque: connectDB → seed → archivado → listen
│   │   ├── config/database.js    pool pg (DATABASE_URL o variables sueltas)
│   │   ├── middlewares/      auth (JWT), role (permisos), validaciones, multer
│   │   ├── routes/ controllers/ services/ queries/     (9 módulos)
│   │   ├── database/         seed-empleados.js (cifra), archivado.js
│   │   ├── utils/            cifrado.js, httpError.js, passwordInicial.js
│   │   └── constantes/mensajes.js
│   ├── database/
│   │   ├── schema.sql        tablas, vistas, función, procedimiento, rol hotel_app
│   │   ├── seed.sql          roles, permisos, usuarios demo, catálogos
│   │   └── migrations/       cambios para bases ya creadas
│   ├── scripts/              backup-db.js, test-db.js
│   └── Dockerfile            npm ci --omit=dev + npm start
│
├── frontend/
│   ├── src/
│   │   ├── router.jsx        8 rutas, todas protegidas menos /login
│   │   ├── context/AuthContext.jsx
│   │   ├── components/       Layout, ProtectedRoute, ControlDeSesion, ui/ (shadcn)
│   │   ├── pages/            login, dashboard, empleados, calendario,
│   │   │                     usuarios, perfil, reportes, configuracion
│   │   ├── services/         un archivo por módulo de la API
│   │   ├── apis/axios.js     interceptores: Bearer + 401 → logout
│   │   └── lib/fechas.js     helpers sin new Date(iso), evita el corrimiento UTC
│   └── vercel.json           rewrite SPA (necesario: el 401 hace location.href)
│
├── docs/                     ANALISIS-TECNICO, defensa, backups, y análisis puntuales
├── docker-compose.yml
└── postman.json              42 requests, 9 carpetas
```

---

## 9. Comandos

```bash
# Entorno completo
docker compose up -d

# Backend local contra el Postgres de Docker (hot reload de verdad)
npm run dev --prefix backend

# Frontend
npm run dev --prefix frontend      # Vite, puerto 5173
npm run lint --prefix frontend
npm run build --prefix frontend

# Base de datos
docker exec -it hotel-yacanto-postgres psql -U postgres -d hotel_yacanto
npm run db:backup --prefix backend
```

---

## 10. Notas operativas

**Nodemon dentro del contenedor no ve las ediciones desde Windows.** El mount no
propaga eventos de archivo. Después de tocar código del backend:
`docker restart hotel-yacanto-backend`. Corriendo el backend local con `npm run dev`
el hot reload sí funciona.

**Docker Desktop se cae con sockets huérfanos.** Error tipo *"initializing X:
listening on unix://...: remove ...: acceso denegado"*. Lo que funciona sin reiniciar
Windows: renombrar la carpeta padre del socket
(`Rename-Item $env:LOCALAPPDATA\docker-secrets-engine docker-secrets-engine.old`) y
relanzar. También se ha visto a los contenedores salir con código 255 cuando el
engine se cae solo — se resuelve relevantándolos.

**Fechas.** Nunca usar `new Date('2026-11-20')`: se parsea como UTC y en UTC-3 se ve
un día antes. El type parser de `pg` devuelve DATE como string y `lib/fechas.js` opera
sobre strings.

**Git Bash traduce rutas.** `docker exec ... -f /tmp/x.sql` se convierte en una ruta
de Windows y falla. Prefijar con `MSYS_NO_PATHCONV=1`.

**Cambios en `.env` no los toma `docker restart`.** Las variables se fijan al crear el
contenedor: hay que hacer `docker compose up -d --force-recreate backend`.

**Lint: el patrón `(async () => { await cargar(); })()` en los `useEffect` es
deliberado.** Sin la IIFE, `eslint-plugin-react-hooks` v7 falla con
`set-state-in-effect`. Cada archivo tiene un comentario explicándolo — no
"simplificarlo" de vuelta.
