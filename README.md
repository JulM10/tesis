# Plataforma para la Gestión Integral de Empleados

### Caso de Estudio: Hotel Yacanto

> Tesis Final – Carrera Analista en Sistemas (IES21)
> Autor: **Julio Madero**

---

## Descripción

Plataforma web de gestión de RRHH para el sector hotelero y gastronómico. Permite administrar empleados, organizar turnos de trabajo, registrar asistencia y licencias, gestionar roles y permisos, y generar reportes operativos, centralizando la información en una única plataforma segura.

Se accede desde el navegador: no exige instalar software en cada puesto ni renovar los equipos, de modo que funciona sobre las computadoras que el hotel ya tiene e incluso desde un celular.

El sistema implementa autenticación JWT, autorización por permisos (RBAC), encriptación de datos personales (AES-256-GCM) y hash irreversible de credenciales (bcrypt).

---

## Arquitectura

Monorepo con deploy independiente por carpeta: **Vercel** para el frontend y **Render** para el backend y la base de datos.

El backend sigue una arquitectura en capas: **routes → middlewares (auth, RBAC, validación) → controllers → services → queries (SQL puro)**.

```
tesis/
│
├── frontend/                  # React 19 + Vite + Tailwind + shadcn/ui
│   ├── src/
│   │   ├── apis/              # Cliente axios con interceptores JWT
│   │   ├── components/        # Layout, ProtectedRoute, ControlDeSesion,
│   │   │                      # CambioPassword, CodigoAsistencia, EstadoAsistencia,
│   │   │                      # LicenciasEmpleado, TipoLicencia, EstadoEmpleado,
│   │   │                      # BuscadorEmpleado, GraficoDotacion, ui/ (shadcn)
│   │   ├── context/           # AuthContext (sesión global)
│   │   ├── pages/             # login, dashboard, empleados, calendario, usuarios,
│   │   │                      # perfil, reportes, configuracion, kiosco, marcar
│   │   ├── services/          # Consumo de la API por módulo
│   │   └── lib/               # Helpers (fechas, utils)
│   ├── vercel.json            # Configuración de deploy (rewrites de la SPA)
│   └── vite.config.js
│
├── backend/                   # Node.js 20 + Express 4 + PostgreSQL 16
│   ├── database/
│   │   ├── schema.sql         # Tablas, vistas, funciones, stored procedures, RBAC
│   │   └── seed.sql           # Datos demo (usuarios, roles, permisos, catálogos,
│   │                          # turnos) y las credenciales de demostración
│   ├── src/
│   │   ├── config/            # Conexión PostgreSQL (pool, rol hotel_app)
│   │   ├── constantes/        # Mensajes centralizados
│   │   ├── controllers/       # auth, empleados, calendario, horarios, asistencia,
│   │   │                      # licencias, usuarios, me, catalogos, reportes,
│   │   │                      # establecimiento
│   │   ├── middlewares/       # auth (JWT), role (RBAC), kiosco (clave de equipo),
│   │   │                      # validaciones, multer (CV)
│   │   ├── queries/           # SQL puro parametrizado (cero concatenación)
│   │   ├── routes/            # Rutas REST por módulo
│   │   ├── services/          # Lógica de negocio + cifrado/descifrado
│   │   ├── utils/             # cifrado.js (AES-256-GCM), codigoAsistencia.js (TOTP
│   │   │                      # del kiosco), httpError.js, passwordInicial.js
│   │   ├── database/          # seed-empleados.js (seed cifrado), licencias.js,
│   │   │                      # archivado.js
│   │   ├── app.js             # Express (CORS, compresión, rutas, 404)
│   │   └── server.js          # Entry point
│   ├── scripts/               # backup-db.js (backup/restore)
│   ├── .env.example
│   └── Dockerfile
│
├── docs/
│   ├── schema-interactivo.html # Diagrama navegable del modelo de datos
│   └── backups.md              # Estrategia de respaldos
│
├── docker-compose.yml         # Backend + PostgreSQL con init automático
└── README.md
```

---

## Tecnologías

| Capa | Stack |
|---|---|
| **Frontend** | React 19, Vite 7, Tailwind CSS 4, shadcn/ui (Radix), axios, react-router-dom 7, recharts, qrcode.react, sonner, lucide-react |
| **Backend** | Node.js 20, Express 4, SQL puro con `pg` (sin ORM), multer, compression |
| **Base de datos** | PostgreSQL 16 (vistas SQL, funciones, stored procedures, RBAC en tablas) |
| **Seguridad** | JWT (jsonwebtoken) + bcryptjs, AES-256-GCM (crypto nativo), rol de BD con mínimo privilegio |
| **Infraestructura** | Docker, Docker Compose, Vercel (frontend), Render (backend y base de datos) |
| **Calidad** | ESLint, Nodemon |

---

## Módulos implementados

### Backend (API REST)

- **Auth** – Login JWT, renovación de sesión y cambio de la contraseña propia, con flag `debe_cambiar_password` que obliga a cambiarla en el primer ingreso y después de un reseteo
- **Empleados** – CRUD con alta unificada (crea empleado + cuenta en una transacción), CV adjunto (PDF/DOCX cifrado en PostgreSQL), datos personales cifrados (AES-256-GCM)
- **Calendario** – CRUD de turnos con validación de horarios (`hora_fin > hora_inicio`)
- **Horarios** – Asignación de empleados a turnos con validación de solapamiento (`SELECT FOR UPDATE`), historial inmutable desnormalizado
- **Asistencia** – Marcado de ingreso y egreso contra un código de 6 dígitos que rota cada 30 segundos. El kiosco se autentica como equipo (`X-Kiosco-Clave`), no como usuario; el empleado marca con su propia sesión, y el servidor deduce si es ingreso o egreso según sus turnos del día. RRHH puede corregir una marca
- **Licencias** – Vacaciones, enfermedad y licencias especiales. Las vacaciones descuentan del saldo anual y se rechazan si pisan un turno asignado; enfermedad y especial se registran siempre, porque no se planifican. El comentario viaja cifrado
- **Usuarios** – Gestión de cuentas (solo ADMINISTRADOR): editar email/rol/estado, reset de contraseña temporal
- **Me** – Autogestión del empleado logueado: ver/editar mis datos, mis turnos, mi CV, mis licencias y mi marcado de asistencia
- **Catálogos** – Puestos, lugares de trabajo, estados
- **Reportes** – Historial de turnos, horas trabajadas, licencias, saldo de vacaciones y dotación por puesto (puntual y por período). Archivado automático de turnos completados (stored procedure idempotente)
- **Establecimiento** – Gestión de puestos, lugares de trabajo y estados

### Frontend (SPA)

| Pantalla | Ruta | Qué hace |
|---|---|---|
| **Login** | `/login` | Autenticación real contra la API, toasts de error con sonner |
| **Dashboard** | `/` | Indicadores (total, activos, de vacaciones, turnos de hoy), turnos próximos, dotación por puesto, cumpleaños y antigüedad |
| **Empleados** | `/empleados` | Tabla CRUD con Dialog, selects de catálogos, subida/descarga de CV, licencias del empleado |
| **Calendario** | `/calendario` | Vista semanal con navegación, alta de turnos, asignación de empleados, validación de solapamientos. Abre filtrado en los turnos propios |
| **Usuarios** | `/usuarios` | Gestión de cuentas (solo ADMINISTRADOR), reset de contraseña |
| **Mi Perfil** | `/mi-perfil` | Datos personales, contacto, notas editables, mis turnos, mi CV, cambio de contraseña |
| **Reportes** | `/reportes` | Historial, horas trabajadas, licencias, vacaciones y dotación, con filtros y descarga CSV |
| **Configuración** | `/configuracion` | Gestión del establecimiento (puestos, lugares, estados) |
| **Kiosco** | `/kiosco` | Pantalla de recepción: QR y código de 6 dígitos que rotan cada 30 s. **Ruta pública**, se autentica con la clave del kiosco |
| **Marcar** | `/marcar` | Destino del QR, pensada para el celular. Marca sola al entrar; si la sesión no estaba abierta, el login vuelve acá con el código intacto |

---

## Seguridad

| Capa | Mecanismo |
|---|---|
| Credenciales | bcrypt (hash irreversible, salt + cost 10) |
| Datos personales | AES-256-GCM en la aplicación: **DNI**, fecha de nacimiento, teléfono, dirección, notas, comentarios de licencias y el archivo del CV |
| Autenticación | JWT con expiración + renovación automática + cierre de sesión por inactividad |
| Autorización | RBAC con 3 roles (ADMINISTRADOR, RRHH, EMPLEADO), permisos granulares en BD |
| Contraseñas | Las iniciales y las reseteadas son de un solo uso: el sistema exige cambiarlas antes de operar |
| Asistencia | Código rotativo de 30 s: prueba presencia física. El equipo del kiosco no tiene sesión de usuario |
| Base de datos | Rol `hotel_app` con mínimo privilegio (sin DDL), puerto 5432 solo en localhost |
| Privacidad | El empleado no ve los datos de los demás (Ley 25.326); su autogestión pasa por `/api/me` |

---

## Autenticación

1. `POST /api/auth/login` con `{ email, password }` → `{ token, usuario }` (incluye `debe_cambiar_password`)
2. Los endpoints protegidos requieren `Authorization: Bearer <token>`
3. Cada endpoint valida un permiso específico (ej. `EMPLEADOS_CREAR`), definido por rol en la BD
4. La sesión se renueva automáticamente; la inactividad prolongada la cierra

Usuarios demo y sus contraseñas: ver los comentarios de `backend/database/seed.sql`.

---

## Ejecución en desarrollo

**Backend + Base de datos** (desde la raíz):

```bash
# Primera vez: copiar backend/.env.example a backend/.env y completar valores
docker compose up --build
```

Reiniciar la BD desde cero (recarga schema + seed):

```bash
docker compose down -v && docker compose up --build
```

**Frontend:**

```bash
cd frontend && npm install && npm run dev
```

**Backups:**

```bash
cd backend
npm run db:backup     # backup comprimido (retención de 7)
npm run db:restore -- ../backups/<archivo>.dump
```

---

## Control de versiones

`production` es la rama principal y estable, y la que despliegan Vercel y Render. Las funcionalidades se desarrollaron en ramas `feature/*` que se integraron y se eliminaron una vez fusionadas.
