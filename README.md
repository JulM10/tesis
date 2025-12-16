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
- Integración continua simplificada

La arquitectura mantiene una separación clara de responsabilidades entre frontend, backend y documentación técnica.

---

## 📁 Estructura del Proyecto

```txt
tesis-hotel-employee-management/
│
├── frontend/               # Aplicación React (UI)
│   ├── src/
│   ├── public/
│   ├── vite.config.js
│   └── README.md
│
├── backend/                # API REST (Node.js + Express)
│   ├── src/
│   │   ├── config/         # Configuración y entorno
│   │   ├── models/         # Modelos de datos (MongoDB)
│   │   ├── controllers/   # Controladores HTTP
│   │   ├── routes/        # Rutas de la API
│   │   ├── services/      # Lógica de negocio
│   │   ├── middlewares/   # Middlewares globales
│   │   ├── app.js         # Configuración de Express
│   │   └── server.js      # Entry point
│   ├── tests/
│   ├── .env.example
│   └── README.md
│
├── docs/                   # Documentación técnica y académica
│   ├── arquitectura.md
│   ├── control-versiones.md
│   └── decisiones-tecnicas.md
│
├── .github/
│   └── workflows/          # CI / GitHub Actions
│
├── .env.example
├── .gitignore
└── README.md
```

## ⚙️ Tecnologías Utilizadas

- Frontend: React JS, Vite, JavaScript (ES6+)
- Backend: Node.js, Express.js
- Base de datos: MongoDB, Mongoose
- DevOps y calidad: GitHub, GitHub Actions, ESLint, Nodemon

## 🌱 Entornos

- El sistema contempla dos entornos principales:
- Development: desarrollo y pruebas locales
- Production: versión estable del sistema
- La configuración se gestiona mediante variables de entorno definidas en archivos .env (no versionados).

## 🔀 Flujo de Trabajo y Control de Versiones

- Se implementó una estrategia de ramas basada en buenas prácticas:
- `production` → rama principal y estable
- `develop` → integración de funcionalidades
- `feature/*` → desarrollo de nuevas funcionalidades
- El repositorio cuenta con protección de ramas (rulesets), uso obligatorio de Pull Requests y validaciones automáticas mediante CI.

## ▶️ Ejecución en Desarrollo
```bash
cd backend
npm install
npm run dev

Frontend
cd frontend
npm install
npm run dev
