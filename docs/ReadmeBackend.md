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
## Empleados

- GET /api/empleados
- GET /api/empleados/:id
- POST /api/empleados
- PUT /api/empleados/:id
- DELETE /api/empleados/:id

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