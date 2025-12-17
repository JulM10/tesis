# Resoluciones Técnicas

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
- **RRHH**: gestión de empleados y horarios, sin permisos para eliminar usuarios.
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
