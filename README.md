# 🏨 Plataforma para la Gestión Integral de Empleados
### Caso de Estudio: Hotel Yacanto

> Tesis Final – Carrera Analista en Sistemas
> Autor: **Julio Madero**

---

## 📖 Descripción

Este proyecto corresponde a la **tesis final de la carrera Analista en Sistemas**.
Consiste en una plataforma web orientada a la **gestión integral de empleados en el sector hotelero**, combinando funcionalidades de **CRM** y **Recursos Humanos**.

El sistema permite administrar empleados, organizar horarios de trabajo, gestionar roles y optimizar el proceso de incorporación de nuevos empleados, centralizando la información en una única plataforma.

---

## 🏗️ Arquitectura

El proyecto adopta una **arquitectura Monorepo**, donde frontend y backend conviven en un único repositorio.

### Beneficios de esta arquitectura:
- Código centralizado
- Mejor trazabilidad de cambios
- Gestión unificada de versiones
- Deploy independiente por carpeta (Vercel para frontend, Railway para backend)

El backend sigue una arquitectura en capas: **routes → controllers → services → queries (SQL puro)**.

---

## 📁 Estructura del Proyecto

```txt
tesis/
│
├── frontend/               # Aplicación React (UI)
│   ├── src/
│   │   ├── apis/           # Cliente axios
│   │   ├── components/     # Componentes (shadcn/ui en components/ui)
│   │   ├── pages/          # Pantallas (login, ...)
│   │   └── services/       # Consumo de la API
│   └── vite.config.js
│
├── backend/                # API REST (Node.js + Express + PostgreSQL)
│   ├── database/
│   │   ├── schema.sql      # Esquema (tablas, vistas, índices)
│   │   └── seed.sql        # Datos de prueba (usuarios demo)
│   ├── src/
│   │   ├── config/         # Conexión a PostgreSQL (pool)
│   │   ├── constantes/     # Mensajes centralizados
│   │   ├── controllers/    # Controladores HTTP
│   │   ├── middlewares/    # Auth (JWT), permisos y validaciones
│   │   ├── queries/        # SQL puro parametrizado
│   │   ├── routes/         # Rutas de la API
│   │   ├── services/       # Lógica de negocio
│   │   ├── utils/          # Helpers (manejo de errores HTTP)
│   │   ├── app.js          # Configuración de Express
│   │   └── server.js       # Entry point
│   ├── .env.example        # Variables de entorno de referencia
│   └── Dockerfile
│
├── docs/                   # Documentación técnica
│   ├── ANALISIS-TECNICO.md     # Auditoría técnica y roadmap
│   ├── ReadmeBackend.md        # Detalle del backend y endpoints
│   ├── ResolucionesTecnicas.md # Decisiones técnicas por fase
│   └── PorSiMeOlvido.md        # Comandos útiles (Docker/psql)
│
├── docker-compose.yml      # Backend + PostgreSQL con init automático
├── postman.json            # Colección Postman (incluye login con token automático)
└── README.md
```

## ⚙️ Tecnologías Utilizadas

- **Frontend:** React 19, Vite 7, Tailwind CSS 4, shadcn/ui, axios, react-router
- **Backend:** Node.js 20, Express 4, SQL puro con `pg` (sin ORM)
- **Base de datos:** PostgreSQL 16
- **Autenticación:** JWT (jsonwebtoken) + bcryptjs, autorización por permisos (RBAC en base de datos)
- **DevOps y calidad:** Docker, Docker Compose, ESLint, Nodemon

## 🔐 Autenticación

La API está protegida con JWT. Flujo:

1. `POST /api/auth/login` con `{ "email", "password" }` → devuelve `{ token, usuario }`
2. El resto de los endpoints requieren header `Authorization: Bearer <token>`
3. Cada endpoint valida un permiso específico (ej. `EMPLEADOS_CREAR`), definido por rol en la base de datos

Usuarios demo y sus passwords: ver comentario en `backend/database/seed.sql`.

## 🌱 Entornos

- **Development:** desarrollo y pruebas locales (Docker Compose)
- **Production:** versión estable del sistema
- La configuración se gestiona con variables de entorno (`backend/.env`, no versionado).
  Para crearlo: copiar `backend/.env.example` y completar los valores.

## 🔀 Flujo de Trabajo y Control de Versiones

- `production` → rama principal y estable
- `develop` → integración de funcionalidades
- `feature/*` → desarrollo de nuevas funcionalidades

## ▶️ Ejecución en Desarrollo

**Backend + Base de datos** (desde la raíz del proyecto):
```bash
# Primera vez: crear backend/.env a partir de backend/.env.example
docker compose up --build

# Para reiniciar la base de datos desde cero (recarga schema + seed):
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
