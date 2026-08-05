# Defensa de tesis — Tips, argumentos y preguntas probables

> Documento vivo: acá se acumulan los argumentos técnicos, decisiones de diseño
> y respuestas preparadas para la defensa. Credenciales de demo en
> [pasos-a-presentar.md](pasos-a-presentar.md).

---

## 1. Seguridad de contraseñas (ya implementado ✓)

**Las contraseñas NO se encriptan: se hashean con bcrypt.** Distinción clave que el tribunal puede preguntar:

| | Encriptación | Hash (bcrypt) |
|---|---|---|
| ¿Reversible? | Sí, con la clave | **No, nunca** |
| ¿El sistema puede recuperar la contraseña? | Sí (mal) | No (bien) |
| Si roban la BD **y** la clave | Leen todo | Siguen sin poder revertir |

- Una contraseña solo necesita **verificarse**, nunca recuperarse → hash irreversible es lo correcto. Por eso existe "restablecer contraseña" y no "recuperar contraseña".
- **Dónde está en el código:** alta con `bcrypt.hash(password, 10)` en `usuarios.services.js`; login con `bcrypt.compare()` en `auth.services.js`. El texto plano jamás toca la BD.
- **Qué aporta bcrypt sobre un SHA-256 común:**
  1. **Salt automático** por hash → dos usuarios con la misma contraseña generan hashes distintos (anula rainbow tables).
  2. **Cost factor 10** = 2¹⁰ iteraciones → cada intento tarda ~100ms: nada para un login real, devastador para fuerza bruta.

**Frase para la defensa:** "Credenciales → hash irreversible. Datos personales que hay que volver a leer → encriptación reversible. Dos problemas distintos, dos herramientas distintas."

---

## 2. Encriptación de datos personales — ✅ IMPLEMENTADO (AES-256-GCM en la aplicación)

**Estado:** implementado con la Opción 2. Se cifran `telefono`, `direccion`, `notas`, `fecha_nacimiento` y el binario del CV. La BD solo ve `enc:<iv>:<authTag>:<cifrado>` (texto) o `[iv|tag|cifrado]` (binario). Piezas clave:

- `backend/src/utils/cifrado.js` — cifrar/descifrar texto y binario, `crypto` nativo de Node (cero dependencias)
- Clave en `DATA_ENCRYPTION_KEY` (32 bytes hex, `.env`, nunca commiteada ni enviada a la BD)
- El cifrado/descifrado vive solo en la capa de servicios → **el frontend no cambió ni una línea** (la API sigue devolviendo datos en claro con la edad ya calculada)
- La edad se calcula en Node tras descifrar (SQL ya no puede leer la fecha)
- El seed de empleados se mudó de `seed.sql` a `src/database/seed-empleados.js`: corre al arrancar el backend si la tabla está vacía, porque los datos deben cifrarse antes del INSERT
- IV aleatorio por registro: dos teléfonos iguales generan cifrados distintos (no hay patrones)

### Demo en vivo (2 minutos, verificada)

```
1. psql:  SELECT nombre, telefono FROM empleados;
          → "enc:zwJiR8oRfTClRug2:s3UPlT..." (ilegible)
2. App:   perfil de Juan → teléfono legible
3. psql:  UPDATE empleados SET telefono = OVERLAY(telefono PLACING 'X' FROM 30) WHERE id=1;
          → la API responde 500: "Dato cifrado inválido o adulterado"
          (GCM detectó la manipulación — art. 9: "detectar desviaciones")
4. El CV en la BD tampoco arranca con "%PDF": binario cifrado.
```

### El análisis que llevó a la decisión (dos opciones evaluadas):

### Opción 1 — pgcrypto (encriptación en Postgres)
- `PGP_SYM_ENCRYPT/DECRYPT` en las queries; cambios solo en la capa de queries.
- Las vistas siguen calculando la edad y los cumpleaños en SQL.
- **Debilidad:** la clave viaja en cada consulta SQL → puede quedar en logs de Postgres (`log_statement`, `pg_stat_activity`).

### Opción 2 — AES-256-GCM en la aplicación (LA MÁS SEGURA)
- El backend encripta antes del INSERT y desencripta después del SELECT (`crypto` nativo de Node).
- **La clave nunca sale del backend**; Postgres solo ve bytes → modelo zero-trust: un dump, un backup robado o el compromiso total del contenedor de BD no exponen nada.
- **GCM = encriptación autenticada**: si alguien altera los bytes en la BD, la desencriptación falla (detecta manipulación).
- Costo: la edad calculada y los cumpleaños se mudan de SQL a Node; más archivos a tocar.

**Criterio de qué encriptar:** teléfono, dirección, notas (y opcionalmente fecha de nacimiento y CV). Nombre/apellido quedan en claro por necesidad funcional (listados, búsquedas) — argumento de **proporcionalidad** alineado con la Ley 25.326.

**Frase para la defensa:** "Si la pregunta es cuál protege mejor, la respuesta es encriptación en la aplicación. Si la pregunta es cuál es proporcional a este sistema, compite pgcrypto por simplicidad. Elegí [X] y la otra queda documentada como alternativa."

### ¿Qué dice la Ley 25.326 sobre cifrar? (ej: "¿por qué no cifraron los nombres?")

- **La ley no exige cifrar ningún campo en particular.** El art. 9 es tecnológicamente neutro: pide "las medidas técnicas y organizativas que resulten **necesarias**" — delega el juicio de proporcionalidad al responsable. Cifrar lo riesgoso y dejar el nombre en claro no es un atajo: **es el estándar que la ley pide**.
- **Nombre = dato personal, NO dato sensible** (art. 2). Sensibles son: origen racial/étnico, opiniones políticas, convicciones religiosas, afiliación sindical, salud y vida sexual. El nombre es un identificador de bajo riesgo, necesario para operar el sistema (art. 4: datos "pertinentes y no excesivos").
- **Mapeo art. 9 ↔ AES-GCM (punto fuerte):** el artículo exige evitar la "adulteración" y "detectar desviaciones, intencionales o no" → GCM es cifrado autenticado: si alguien altera los bytes en la BD, el authTag no valida y el sistema lo detecta. La elección técnica responde al texto exacto de la ley.
- **Resolución AAIP 47/2018** (reemplazó a la Disposición DNPDP 11/2006): lista el cifrado como medida **recomendada** para datos en medios informatizados. Citarla muestra conocimiento del marco completo.
- **⚠️ Alerta preparada — estado "Enfermo":** roza el dato de salud (sensible, art. 2). Respuesta: es dato operativo mínimo para gestionar turnos en el marco de la relación laboral (art. 5 habilita el tratamiento necesario para el contrato); no se guarda diagnóstico ni historia clínica. Alternativa de blindaje total: renombrarlo a "Licencia".

---

## 3. CVs guardados en PostgreSQL (BYTEA) — decisión de diseño

**Decisión:** el binario del CV vive en Postgres, en una tabla separada `empleados_cv`. Antes estaba en Supabase Storage; se migró a propósito. Análisis completo en [analisis-cv-postgres.md](analisis-cv-postgres.md).

**Por qué tabla separada y no columna en `empleados`:**
1. Los listados nunca arrastran megabytes de binario (la única query que lee `archivo` es la descarga).
2. `PRIMARY KEY = FK` fuerza la relación 1:1 a nivel de esquema.
3. `ON DELETE CASCADE`: el CV vive y muere con el empleado — integridad transaccional que un storage externo no da.

**Por qué Postgres y no Supabase/S3 (para ESTA escala):**
- Demo autocontenida: sin internet, sin servicio externo que pueda estar caído/pausado el día de la defensa.
- Escala del problema: 20 empleados × 5MB máx = 100MB peor caso (BYTEA admite hasta 1GB por valor).
- Consistencia: sin archivos huérfanos posibles.

**Mejora a futuro (decilo vos antes de que pregunten):** a mayor escala, el binario iría a object storage (S3, Cloudflare R2, Supabase). La migración toca solo las 3 queries de CV — decisión **reversible y de bajo costo**, eso es parte del argumento arquitectónico.

**Seguridad del CV:** nunca se sirve por URL pública; siempre pasa por el backend que valida sesión JWT + permisos RBAC.

---

## 4. Edad calculada, no almacenada

- La columna `edad` se eliminó: era un dato que **envejece mal** (queda desactualizado en cada cumpleaños).
- Se deriva en la vista: `EXTRACT(YEAR FROM age(fecha_nacimiento))::int` — siempre correcta, sin mantenimiento.
- En el formulario la edad es un campo de solo lectura que se recalcula en vivo al cambiar la fecha.
- **Principio general para la defensa:** "no almacenar lo que se puede derivar" (single source of truth). Mismo criterio que el historial de horarios desnormalizado pero por la razón inversa: ahí se copia a propósito para que sea inmutable.

**Caso borde verificado:** alguien nacido el 17/07 consultado el 16/07 devuelve la edad sin cumplir (el cálculo respeta mes y día, no solo el año).

---

## 5. RBAC y privacidad (Ley 25.326)

- Tres roles: ADMINISTRADOR (todo, incluida la gestión de cuentas), RRHH (empleados/calendario/reportes; sobre usuarios solo lectura), EMPLEADO (mínimo).
- **El rol EMPLEADO no tiene `EMPLEADOS_VER`**: los datos personales del resto del personal no le corresponden (Ley 25.326). Su propia información la accede vía `GET /api/me`, resuelta **desde el token JWT, nunca por parámetro** → un empleado no puede pedir datos de otro ni manipulando la request.
- Sí conserva `CALENDARIO_VER`: la grilla de turnos es dato operativo, no personal.
- Autogestión limitada (`PUT /api/me`): el empleado rectifica solo sus datos de contacto y descripción — puesto/lugar/estado los gestiona RRHH (derecho de rectificación de la 25.326, acotado).
- Usuarios de demo para mostrar los bordes: `inactivo@` (no loguea), `sinrol@` (loguea sin permisos).

---

## 6. Decisiones de arquitectura defendibles

- **Capas separadas en el backend:** rutas → middlewares (auth, RBAC, validación, multer) → controladores → servicios → queries. Cada capa con una responsabilidad.
- **Vistas SQL** (`vw_empleados_detalle`, `vw_horarios_empleado`, `vw_usuarios_permisos`): la lógica de joins vive en la BD, las queries del backend quedan triviales, y sirvieron para cambiar el storage del CV **sin tocar el frontend** (el contrato de la API no cambió).
- **Docker Compose**: Postgres + backend reproducibles; el schema y el seed se aplican solos al crear el volumen (`docker-entrypoint-initdb.d`). La demo se levanta con un comando.
- **Errores con mensajes centralizados** (`constantes/mensajes.js`) y `httpError` uniforme.
- **Historial de horarios desnormalizado a propósito** (`asignacion_horario_historial` guarda nombres/textos, no FKs): un reporte histórico no debe cambiar si después renombran el puesto o borran al empleado — inmutabilidad intencional.

---

## 7. Base de datos: rutinas de reportes, mínimo privilegio y backups — ✅ IMPLEMENTADO

### Rutinas SQL: cada herramienta para su trabajo (pregunta clásica: "¿usaron stored procedures?")

| Necesidad | Herramienta | Implementación |
|---|---|---|
| Reportes de forma fija | **Vistas** | `vw_reporte_historial_horarios`, `vw_reporte_empleados_puesto_lugar` |
| Agregación con parámetros | **Función** | `fn_horas_trabajadas(desde, hasta)` → turnos y horas por empleado/puesto |
| Archivado (muta datos) | **Procedimiento** | `archivar_turnos_completados()` — el caso legítimo de un stored procedure |

- **Archivado automático e idempotente:** el backend invoca el procedimiento al arrancar; copia al historial inmutable los turnos con fecha pasada y los marca (`archivado`), así correrlo dos veces no duplica. Verificado: 20 turnos archivados en el primer arranque, 0 duplicados al reiniciar.
- **El historial funciona sin descifrar nada:** guarda solo datos operativos + nombres (en claro por proporcionalidad). Los reportes y el CSV se resuelven 100% en SQL a pesar del cifrado — el diseño desnormalizado y el criterio de qué cifrar encajan solos.
- Índices para reportes: `historial(fecha)`, `historial(puesto)`, más un índice parcial para el archivador (`WHERE NOT archivado`).

### Mínimo privilegio: el backend no es superusuario

- El backend se conecta como **`hotel_app`**: solo SELECT/INSERT/UPDATE/DELETE sobre las tablas de la app. **Sin DDL** — verificado: `DROP TABLE` y `CREATE TABLE` fallan con permission denied.
- Si comprometen el backend, no pueden alterar ni destruir el esquema. El superusuario `postgres` queda solo para administración (`docker exec`).
- **Defensa en profundidad** (frase para el tribunal): RBAC en la app (permisos por rol) + rol de BD con mínimos privilegios + cifrado de datos personales + hash de credenciales — cuatro capas independientes; comprometer una no rinde las demás.

### Superficie de red reducida

- El puerto 5432 quedó atado a `127.0.0.1`: Postgres es invisible desde la red; solo el backend (red interna de Docker) y la propia máquina llegan a él.

### Backups (el documento de tesis los promete — gap cerrado)

- `npm run db:backup` / `db:restore`: `pg_dump -Fc` vía Docker, retención de 7 dumps, `backups/` fuera del repo. Detalle operativo en [backups.md](backups.md).
- **Punto fuerte:** los backups son **seguros por diseño** — los datos personales dentro del dump están cifrados, así que un backup robado tampoco expone nada. Contracara honesta: la `DATA_ENCRYPTION_KEY` se resguarda por separado; sin ella el backup es irrecuperable.
- **Restore ensayado** (17/07/2026): borrado de 17 empleados → restore → 20 empleados y el historial de vuelta, API descifrando normal.

---

## 8. Preguntas probables del tribunal (con respuesta corta)

**"¿Por qué no encriptaron toda la base?"**
→ Proporcionalidad: se protege el dato personal (25.326), no el operativo. Encriptar todo rompe búsquedas/índices sin beneficio real. Las credenciales van con hash, que es más fuerte que encriptar.

**"¿Qué pasa si les roban la base de datos?"**
→ Contraseñas: bcrypt con salt, no reversibles. Datos personales y CVs: cifrados con AES-256-GCM — bytes ilegibles sin la clave, que vive solo en el backend. Un dump completo de la BD no expone ningún dato personal.

**"¿Por qué guardan archivos en la BD? Eso es mala práctica."**
→ Es mala práctica *a escala*. Acá: 100MB peor caso, tabla separada para no penalizar listados, integridad transaccional gratis, demo sin dependencias externas. Y la salida a object storage está diseñada: 3 queries.

**"¿Cómo evitan que un empleado vea datos de otro?"**
→ RBAC por permisos + `/api/me` resuelve la identidad desde el JWT, nunca desde parámetros. No hay endpoint que acepte "dame el empleado X" para el rol EMPLEADO.

**"¿Por qué un turno no puede cruzar la medianoche?"**
→ Limitación conocida y documentada en el schema (`CHECK hora_fin > hora_inicio`). Decisión consciente de alcance; la extensión es conocida (fecha_fin o turnos partidos).

**"¿Tienen estrategia de backups?"**
→ Sí: `pg_dump` comprimido con retención de 7, restore documentado y **ensayado**. Y por el cifrado, un backup robado no expone datos personales — la clave se resguarda por separado.

**"¿Usaron procedimientos almacenados?"**
→ Sí, donde corresponde: un procedimiento para el archivado del historial (muta datos, transaccional, idempotente). Para lecturas usamos vistas, y una función SQL parametrizada para agregaciones por rango de fechas. Cada herramienta para su trabajo.

**"¿Qué pasa si comprometen el servidor backend?"**
→ El rol de BD `hotel_app` no tiene DDL: no pueden alterar ni tirar el esquema. Las contraseñas siguen siendo hashes irreversibles. Lo que sí obtendrían es la clave de cifrado (vive en el backend) — por eso la mejora a futuro documentada es un gestor de secretos (KMS/Vault).

---

## 9. Verificaciones hechas (por si piden evidencia)

- Ciclo completo de CV probado por API y UI: subir → vincular → descargar (binario idéntico, verificado con `cmp`) → reemplazar → eliminar.
- Validaciones de borde: fecha de nacimiento futura rechazada (400); MIME de CV restringido a PDF/DOCX; máximo 5MB.
- Edad: casos de cumpleaños no alcanzado en el año verificados (cálculo en backend tras descifrar).
- Login con usuario inactivo bloqueado; usuario sin rol loguea sin permisos.
- Cifrado: en psql los campos personales muestran `enc:...` y el CV no arranca con `%PDF`; la API devuelve todo en claro; adulterar un byte en la BD produce error 500 con mensaje de integridad (GCM); el CV descargado tras cifrar/descifrar es idéntico byte a byte al original.
- Dashboard (cumpleaños, top antigüedad, turnos asignados) y perfil funcionan igual que antes del cifrado — el frontend no se tocó.
- Archivado: 20 turnos pasados copiados al historial en el primer arranque; reiniciar el backend no duplica (idempotencia verificada).
- `fn_horas_trabajadas('2026-07-01','2026-07-31')` devuelve turnos y horas agregadas por empleado/puesto.
- Mínimo privilegio: `DROP TABLE` y `CREATE TABLE` como `hotel_app` fallan con permission denied; la API opera normal con ese rol.
- Puerto: `docker port` confirma 5432 → solo `127.0.0.1`.
- Backup/restore: dump de 50KB, borrado intencional de 17 empleados, restore, y los 20 empleados + historial de vuelta con la API descifrando normal.
