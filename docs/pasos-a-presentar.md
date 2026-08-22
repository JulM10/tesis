# Pasos a Presentar - Credenciales de Demo

## Usuarios por Rol

### 👤 ADMINISTRADOR
- **Email:** admin@hotel.com
- **Contraseña:** Admin123!
- **Descripción:** Acceso completo. Puede gestionar usuarios, empleados, calendario y permisos.

### 👥 RRHH (Recursos Humanos)
- **Email:** rrhh@hotel.com
- **Contraseña:** Rrhh123!
- **Descripción:** Gestiona empleados, calendario y reportes. Sobre usuarios tiene **solo lectura**: no crea, edita ni elimina cuentas. Tampoco administra la estructura del establecimiento (puestos y lugares).

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

1. **Loguearse como ADMINISTRADOR** → Panel con indicadores, empleados, usuarios,
   reportes con descarga CSV, y Configuración (ABM de puestos y lugares)
2. **Loguearse como RRHH** → Empleados y calendario. Mostrar que **no** le aparece
   Configuración y que en Usuarios solo puede mirar: el mismo sistema, distinta
   superficie según el rol
3. **Loguearse como EMPLEADO** → Perfil personal, CV adjunto y calendario. Mostrar
   que **no** ve los datos personales del resto del personal (Ley 25.326)
4. **Intentar acceder con INACTIVO** → No puede loguear
5. **Loguearse con SINROL** → Loguea pero no ve nada: *deny by default*

### Momentos fuertes para intercalar

- **Cifrado:** abrir psql y hacer `SELECT nombre, telefono FROM empleados;` — el
  teléfono se ve como `enc:...`, ilegible. Después mostrar el mismo dato legible en
  la aplicación. La clave nunca sale del backend.
- **Integridad (GCM):** adulterar un byte del dato cifrado en la BD y ver que la API
  responde error de integridad en vez de devolver basura.
- **Borrado protegido:** intentar eliminar un puesto en uso desde Configuración →
  el sistema responde cuántos empleados lo usan, en vez de un error crudo de BD.
- **Sesión:** el corte por inactividad a los 10 minutos, con el aviso y su cuenta
  regresiva. Explicar que el token dura 15 y se renueva solo mientras hay actividad.
- **Mínimo privilegio:** `DROP TABLE` como `hotel_app` falla con permiso denegado.

---

## Notas Técnicas

- Todas las contraseñas se guardan hasheadas en la BD (bcrypt, cost 10)
- El archivo `backend/database/seed.sql` contiene estos usuarios
- Los roles y permisos se asignan automáticamente en el seed
- Las credenciales de demostración están comentadas en el seed.sql para referencia
