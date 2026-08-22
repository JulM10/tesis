# Plataforma para la Gestión Integral de Empleados

### Caso de Estudio: Hotel Yacanto

> Tesis Final – Carrera Analista en Sistemas (IES21)
> Autor: **Julio Madero**

---

## Descripción

Plataforma web de gestión de RRHH para el sector hotelero y gastronómico. Permite administrar empleados, organizar turnos de trabajo, gestionar roles y permisos, y generar reportes operativos, centralizando la información en una única plataforma segura.

El sistema implementa autenticación JWT, autorización por permisos (RBAC), encriptación de datos personales (AES-256-GCM) y hash irreversible de credenciales (bcrypt).

---

## Arquitectura

Monorepo con deploy independiente por carpeta (Vercel para frontend, Railway para backend).

El backend sigue una arquitectura en capas: **routes → middlewares (auth, RBAC, validación) → controllers → services → queries (SQL puro)**.

```
tesis/
│
├── frontend/                  # React 19 + Vite + Tailwind + shadcn/ui
│   ├── src/
│   │   ├── apis/              # Cliente axios con interceptores JWT
│   │   ├── components/        # Layout, ProtectedRoute, ControlDeSesion, ui/ (shadcn)
│   │   ├── context/           # AuthContext (sesión global)
│   │   ├── pages/             # login, dashboard, empleados, calendario,
│   │   │                      # usuarios, perfil, reportes, configuracion
│   │   ├── services/          # Consumo de la API por módulo
│   │   └── lib/               # Helpers (fechas, utils)
│   └── vite.config.js
│
├── backend/                   # Node.js 20 + Express 4 + PostgreSQL 16
│   ├── database/
│   │   ├── schema.sql         # Tablas, vistas, funciones, stored procedures, RBAC
│   │   └── seed.sql           # Datos demo (usuarios, empleados, turnos)
│   ├── src/
│   │   ├── config/            # Conexión PostgreSQL (pool, rol hotel_app)
│   │   ├── constantes/        # Mensajes centralizados
│   │   ├── controllers/       # auth, empleados, calendario, horarios,
│   │   │                      # usuarios, me, catalogos, reportes, establecimiento
│   │   ├── middlewares/       # auth (JWT), role (RBAC), validaciones, multer (CV)
│   │   ├── queries/           # SQL puro parametrizado (cero concatenación)
│   │   ├── routes/            # Rutas REST por módulo
│   │   ├── services/          # Lógica de negocio + cifrado/descifrado
│   │   ├── utils/             # cifrado.js (AES-256-GCM), httpError.js, passwordInicial.js
│   │   ├── database/          # seed-empleados.js (seed cifrado), archivado.js
│   │   ├── app.js             # Express (CORS, rutas, 404)
│   │   └── server.js          # Entry point
│   ├── scripts/               # backup-db.js (backup/restore)
│   ├── .env.example
│   └── Dockerfile
│
├── docs/                      # Documentación técnica
│   ├── ANALISIS-TECNICO.md    # Auditoría, scorecard, gaps, roadmap
│   ├── defensa.md             # Argumentos para el tribunal
│   ├── pasos-a-presentar.md   # Credenciales demo y guión de presentación
│   ├── ReadmeBackend.md       # Detalle de endpoints y módulos
│   ├── ResolucionesTecnicas.md # Decisiones por fase
│   ├── backups.md             # Estrategia de respaldos
│   ├── contexto-para-claude.md # Estado del proyecto
│   └── ...
│
├── docker-compose.yml         # Backend + PostgreSQL con init automático
├── vercel.json                # Configuración de deploy frontend
├── postman.json               # Colección Postman con auth automática
└── README.md
```

---

## Tecnologías

| Capa | Stack |
|---|---|
| **Frontend** | React 19, Vite 7, Tailwind CSS 4, shadcn/ui (Radix), axios, react-router-dom 7, sonner, lucide-react |
| **Backend** | Node.js 20, Express 4, SQL puro con `pg` (sin ORM), multer |
| **Base de datos** | PostgreSQL 16 (vistas SQL, funciones, stored procedures, RBAC en tablas) |
| **Seguridad** | JWT (jsonwebtoken) + bcryptjs, AES-256-GCM (crypto nativo), rol de BD con mínimo privilegio |
| **Infraestructura** | Docker, Docker Compose, Vercel (frontend), Railway (backend) |
| **Calidad** | ESLint, Nodemon, Postman |

---

## Módulos implementados

### Backend (API REST)
- **Auth** – Login JWT, renovación de sesión, cambio de contraseña con flag `debe_cambiar_password`
- **Empleados** – CRUD con alta unificada (crea empleado + cuenta en una transacción), CV adjunto (PDF/DOCX cifrado en PostgreSQL), datos personales cifrados (AES-256-GCM)
- **Calendario** – CRUD de turnos con validación de horarios (`hora_fin > hora_inicio`)
- **Horarios** – Asignación de empleados a turnos con validación de solapamiento (`SELECT FOR UPDATE`), historial inmutable desnormalizado
- **Usuarios** – Gestión de cuentas (solo ADMIN): editar email/rol/estado, reset de contraseña temporal
- **Me** – Autogestión del empleado logueado: ver/editar mis datos, mis turnos, mi CV
- **Catálogos** – Puestos, lugares de trabajo, estados
- **Reportes** – Historial de turnos, horas trabajadas, dotación por puesto. Archivado automático de turnos completados (stored procedure idempotente)
- **Establecimiento** – Gestión de puestos, lugares de trabajo y estados

### Frontend (SPA)
- **Login** – Autenticación real contra la API, toasts de error con sonner
- **Dashboard** (`/`) – Indicadores (total empleados, activos, vacaciones, turnos de hoy), listas de turnos próximos, dotación por puesto, cumpleaños y antigüedad
- **Empleados** (`/empleados`) – Tabla CRUD con Dialog, selects de catálogos, subida/descarga de CV
- **Calendario** (`/calendario`) – Vista semanal con navegación, alta de turnos, asignación de empleados, validación de solapamientos
- **Usuarios** (`/usuarios`) – Gestión de cuentas (solo ADMIN), reset de contraseña
- **Mi Perfil** (`/mi-perfil`) – Datos personales, contacto, notas editables, mis turnos, mi CV
- **Reportes** (`/reportes`) – Historial, horas trabajadas, dotación con filtros y descarga CSV
- **Configuración** (`/configuracion`) – Gestión de establecimiento (puestos, lugares, estados)

---

## Seguridad

| Capa | Mecanismo |
|---|---|
| Credenciales | bcrypt (hash irreversible, salt + cost 10) |
| Datos personales | AES-256-GCM en la aplicación (teléfono, dirección, notas, fecha nacimiento, CV) |
| Autenticación | JWT con expiración + renovación automática + logout por inactividad |
| Autorización | RBAC con 3 roles (ADMIN, RRHH, EMPLEADO), permisos granulares en BD |
| Base de datos | Rol `hotel_app` con mínimo privilegio (sin DDL), puerto 5432 solo en localhost |
| Privacidad | Empleado no ve datos de otros (Ley 25.326), autogestión limitada vía `/api/me` |

---

## Autenticación

1. `POST /api/auth/login` con `{ email, password }` → `{ token, usuario }` (incluye `debe_cambiar_password`)
2. Endpoints protegidos requieren `Authorization: Bearer <token>`
3. Cada endpoint valida un permiso específico (ej. `EMPLEADOS_CREAR`), definido por rol en la BD
4. La sesión se renueva automáticamente; inactividad prolongada cierra la sesión

Usuarios demo y sus passwords: ver [docs/pasos-a-presentar.md](docs/pasos-a-presentar.md) o comentarios en `backend/database/seed.sql`.

---

## Ejecución en desarrollo

**Backend + Base de datos** (desde la raíz):
```bash
# Primera vez: copiar backend/.env.example a backend/.env y completar valores
docker compose up --build

# Reiniciar la BD desde cero (recarga schema + seed):
docker compose down -v
docker compose up --build
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

**Probar la API:** importar `postman.json` en Postman y ejecutar primero `Auth → POST - Login` (guarda el token automáticamente para el resto de los requests).

**Backups:**
```bash
cd backend
npm run db:backup     # backup comprimido (retención de 7)
npm run db:restore -- ../backups/<archivo>.dump
```

---

## Control de versiones

- `production` → rama principal y estable
- `develop` → integración de funcionalidades
- `feature/*` → desarrollo de nuevas funcionalidades
