# Resoluciones Técnicas – Proyecto Hotel Yacanto

## Introducción

Este documento describe las decisiones técnicas tomadas durante el desarrollo del sistema de gestión del Hotel Yacanto.  
El desarrollo se dividió en fases para organizar la planificación, diseño e implementación del sistema:

- **FASE 1 – Base de datos y SQL**  
  Creación del esquema de la base de datos, relaciones entre tablas, datos dummy y vistas para facilitar consultas.

- **FASE 2 – Arquitectura Backend y Endpoints**  
  Diseño de la estructura del backend, definición de rutas REST, middlewares globales y contrato de API sin lógica de negocio.

- **FASE 3 – Lógica de negocio y servicios**  
  Implementación de controladores y servicios, conexión a la base de datos, validaciones y operaciones CRUD reales.

- **FASE 4 – Frontend y conexión con Backend**  
  Desarrollo del frontend con React/TypeScript, integración con la API, manejo de estados y consumo de endpoints.

- **FASE 5 – Seguridad, roles y autenticación**  
  Implementación de roles de usuario, permisos, autenticación y control de acceso para cada recurso.

- **FASE 6 – Reportes e informes**  
  Creación de vistas, consultas complejas y generación de reportes históricos de empleados, puestos y horarios.

- **FASE 7 – Pruebas, QA y documentación**  
  Tests unitarios y de integración, validación de la API y documentación final del sistema.

---


## FASE 1 – Diseño y Consolidación de la Base de Datos

### 1. Objetivo de la fase

El objetivo de esta fase fue definir y consolidar la arquitectura de la base de datos del sistema, asegurando integridad, escalabilidad y claridad en el acceso a la información. Esta etapa sienta las bases sobre las cuales se construyen la lógica de negocio, los controles de acceso y los reportes del sistema.

---

### 2. Modelo de Datos y Diagrama Entidad-Relación (DER)

Se diseñó un **Diagrama Entidad-Relación (DER)** que representa las entidades principales del dominio del problema:

- Empleados  
- Puestos de trabajo  
- Lugares de trabajo  
- Calendario de horarios  
- Asignación de horarios  
- Usuarios del sistema  
- Roles  

Cada entidad posee una clave primaria (PK) y las relaciones entre ellas se implementan mediante claves foráneas (FK), garantizando la integridad referencial.

El modelo contempla relaciones uno a muchos y muchos a muchos, resueltas mediante tablas intermedias cuando fue necesario, siguiendo criterios de normalización y buenas prácticas de diseño de bases de datos relacionales.

---

### 3. Separación entre empleados y usuarios

Se decidió **separar la entidad Empleado de la entidad Usuario**, evitando unificar información laboral con credenciales de acceso al sistema.

#### Justificación:
- No todos los empleados requieren acceso al sistema.
- La información sensible (usuarios y contraseñas) se gestiona de forma independiente.
- Facilita la extensibilidad futura del sistema, permitiendo distintos tipos de usuarios o accesos temporales.
- Mejora la seguridad y la mantenibilidad del modelo de datos.

Esta decisión aporta claridad conceptual y reduce el acoplamiento entre datos operativos y de autenticación.

---

### 4. Control de acceso basado en roles

El sistema implementa un modelo de **Control de Acceso Basado en Roles (RBAC)**.

Se definieron los siguientes roles:

- **Administrador**: control total del sistema.
- **RRHH**: gestión de empleados, horarios y reportes. Sobre usuarios tiene solo lectura: la administración de cuentas (crear/editar/eliminar, resetear contraseñas) es exclusiva del Administrador.
- **Empleado**: acceso únicamente a información visual y personal.

Los roles se almacenan en una tabla específica y se relacionan con los usuarios, permitiendo que los permisos se administren desde la base de datos y no de forma rígida en el código de la aplicación.

---

### 5. Uso de SQL puro

Se optó por utilizar **SQL puro** para el acceso a datos, descartando el uso de un ORM.

#### Motivos de la decisión:
- Mayor control sobre las consultas y su rendimiento.
- Transparencia total de la lógica de acceso a datos.
- Facilidad para auditar y optimizar consultas.
- Enfoque académico que permite demostrar conocimiento del modelo relacional y del lenguaje SQL.

Esta decisión resulta coherente con la implementación de vistas y reportes complejos.

---

### 6. Uso de vistas SQL

Se implementaron **vistas SQL** con el objetivo de encapsular consultas complejas y facilitar:

- El acceso a datos según el rol del usuario.
- La generación de reportes.
- La reutilización de lógica de consulta.
- La simplificación del código en el backend.

Las vistas no almacenan datos, sino que representan consultas predefinidas optimizadas para lectura.

Ejemplos de vistas implementadas:
- Vista de empleados con puesto y lugar de trabajo.
- Vista de horarios por empleado.
- Vista de historial de asignaciones.
- Vista de reportes consolidados para análisis y estadísticas.

Cada vista incluye comentarios descriptivos dentro del archivo `schema.sql` para facilitar su comprensión y mantenimiento.

---

### 7. Inicialización automática de la base de datos con Docker

La base de datos se inicializa automáticamente utilizando **Docker y Docker Compose**.

Se configuró un contenedor de PostgreSQL que ejecuta scripts SQL al momento de su creación, permitiendo:
- La creación automática del esquema de la base de datos.
- La carga de datos de prueba.
- La reproducción exacta del entorno en distintos equipos.

Este enfoque garantiza consistencia, portabilidad y facilidad de despliegue del sistema.

---

### 8. Resultado de la fase

Al finalizar esta fase, el sistema cuenta con:

- Un modelo de datos sólido y normalizado.
- Control de acceso definido mediante roles.
- Vistas SQL preparadas para consultas y reportes.
- Inicialización automática de la base de datos mediante Docker.

Esta base permite avanzar con el desarrollo del backend, la seguridad y la generación de reportes sin necesidad de reestructurar la base de datos.

# FASE 2 – Arquitectura Backend y Diseño de Endpoints

## 1. Objetivo

En esta fase se definió la arquitectura del backend y el diseño de los endpoints de la API REST para el sistema de gestión del Hotel Yacanto.  
El objetivo fue crear un **backend desacoplado**, escalable y preparado para interactuar con el frontend, sin implementar aún la lógica de negocio.

---

## 2. Estructura del Backend

El backend se organizó en **capas**, siguiendo el principio de separación de responsabilidades:

- **Routes**: reciben las solicitudes HTTP, definen los endpoints y delegan la ejecución a los controladores.  
- **Controllers**: manejan la validación básica de los datos de entrada y la respuesta HTTP, pero **no ejecutan consultas SQL ni lógica de negocio**.  
- **Services**: encapsulan la lógica de negocio y las consultas SQL a la base de datos, devolviendo los resultados a los controladores.

Esta separación permite:
- Mantener el código limpio y fácil de mantener.
- Facilitar la escalabilidad y la integración con nuevas funcionalidades.
- Preparar el backend para la conexión con distintos frontends.

---

## 3. Endpoints Definidos

Se diseñaron endpoints para las entidades principales:

### Empleados
- `GET /api/empleados` → Lista de empleados.  
- `GET /api/empleados/:id` → Obtiene un empleado por su ID.  
- `POST /api/empleados` → Crea un nuevo empleado.  
- `PUT /api/empleados/:id` → Actualiza los datos de un empleado.  
- `DELETE /api/empleados/:id` → Eliminación lógica de un empleado.

### Calendarios
- `GET /api/calendarios` → Lista de turnos disponibles.  
- `POST /api/calendarios` → Crea un nuevo turno.  
- `PUT /api/calendarios/:id` → Modifica un turno existente.  
- `DELETE /api/calendarios/:id` → Elimina un turno.

### Horarios / Asignaciones
- `GET /api/horarios` → Lista de asignaciones de horarios.  
- `GET /api/horarios/:id` → Obtiene una asignación por ID.  
- `GET /api/horarios/empleado/:id` → Horarios de un empleado.  
- `GET /api/horarios/dia/:fecha` → Horarios de un día específico.  
- `POST /api/horarios/asignar` → Asigna un empleado a un turno del calendario.  
- `DELETE /api/horarios/:id` → Elimina una asignación.

**Nota**: No se implementó PUT en horarios, ya que DELETE + POST permite manejar cambios sin romper la integridad de la relación.

---

## 4. Middlewares Globales

Se implementaron middlewares globales para:

- **CORS**: permitir solicitudes desde el frontend.  
- **JSON Parsing**: procesar automáticamente cuerpos de solicitudes en formato JSON.  
- **404 Global**: capturar rutas no definidas y devolver una respuesta uniforme:

```json
{
  "error": "Endpoint no encontrado"
}
```
Esto garantiza consistencia en las respuestas y facilita la integración con el frontend.

## 5. Decisiones de Diseño

- Uso de Router de Express: cada recurso tiene su archivo de rutas y se monta en app.js con prefijo /api/....
- Endpoints REST-friendly: los verbos HTTP indican la acción; la URL representa el recurso.
- Preparación para frontend desacoplado: el backend expone solo JSON, independiente del framework de frontend.
- Separación de responsabilidades: routes → controllers → services → DB. Esto permite que la lógica de negocio y la base de datos sean independientes del manejo HTTP.
