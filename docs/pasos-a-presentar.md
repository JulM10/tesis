# Pasos a Presentar - Credenciales de Demo

## Usuarios por Rol

### 👤 ADMINISTRADOR
- **Email:** admin@hotel.com
- **Contraseña:** Admin123!
- **Descripción:** Acceso completo. Puede gestionar usuarios, empleados, calendario y permisos.

### 👥 RRHH (Recursos Humanos)
- **Email:** rrhh@hotel.com
- **Contraseña:** Rrhh123!
- **Descripción:** Gestiona empleados, usuarios y calendario. No puede eliminar usuarios.

### 👷 EMPLEADO (Operario)
- **Email:** empleado@hotel.com
- **Contraseña:** Empleado123!
- **Descripción:** Acceso a su perfil, CV, notas y visualización de calendario (turnos).
- **Empleado:** Juan Pérez (Cocinero en Cocina)

### 👷 EMPLEADO 2
- **Email:** empleado2@hotel.com
- **Contraseña:** Empleado123!
- **Descripción:** Mismo rol que empleado1. Acceso limitado a su información.
- **Empleado:** Ana Gómez (Mucama en Edificio Principal)

---

## Usuarios de Prueba Especiales

### ❌ USUARIO INACTIVO (No puede loguear)
- **Email:** inactivo@hotel.com
- **Contraseña:** Inactivo123!
- **Estado:** Inactivo (activo = false)
- **Empleado:** Carlos Ruiz (Mantenimiento)

### ⚠️ USUARIO SIN ROL (Loguea sin permisos)
- **Email:** sinrol@hotel.com
- **Contraseña:** Sinrol123!
- **Descripción:** Usuario activo pero sin ningún rol asignado. Útil para probar mensajes de acceso denegado.

---

## Flujo de Presentación Sugerido

1. **Loguearse como ADMINISTRADOR** → Mostrar dashboard, gestión de usuarios y empleados
2. **Loguearse como RRHH** → Mostrar gestión de empleados y calendario
3. **Loguearse como EMPLEADO** → Mostrar perfil personal, CV adjunto y calendario de turnos
4. **Intentar acceder con INACTIVO** → Mostrar que no puede loguear
5. **Loguearse con SINROL** → Mostrar que puede loguear pero sin permisos

---

## Notas Técnicas

- Todas las contraseñas se guardan hasheadas en la BD (bcrypt, cost 10)
- El archivo `backend/database/seed.sql` contiene estos usuarios
- Los roles y permisos se asignan automáticamente en el seed
- Las credenciales de demostración están comentadas en el seed.sql para referencia
