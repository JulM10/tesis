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
- **⚠️ Alerta preparada — estado "Enfermo":** roza el dato de salud (sensible, art. 2). Respuesta: es dato operativo mínimo para gestionar turnos en el marco de la relación laboral (art. 5 habilita el tratamiento necesario para el contrato); no se guarda historia clínica. El comentario de una licencia por enfermedad (donde RRHH puede anotar "certificado, reposo 48 h") va **cifrado** como las notas, y los compañeros no ven ni la licencia ni la asistencia de los demás (ver sección 7b).

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

## 7b. Asistencia y licencias (devolución final del profesor) — ✅ IMPLEMENTADO

### El problema que resuelve

Antes el sistema sabía a qué turno estaba **asignado** cada empleado, pero no si **asistió**. Ahora cada turno tiene marca de ingreso y salida, el historial guarda el resultado (Asistió, Sin salida, No asistió, Enfermedad, Licencia) y las horas trabajadas salen de las marcas, no del horario teórico. En el reporte de historial cada turno tiene un punto de color (verde asistió, rojo no asistió) y arriba el total por estado; se puede filtrar por asistencia.

### Cómo marca el empleado (explicarlo así, en 20 segundos)

1. En recepción hay una PC con la pantalla `/kiosco`: un QR y un número de 6 dígitos que cambian cada 30 segundos.
2. El empleado apunta la cámara del celular al QR, se abre la app y, si no tenía sesión, entra con **su** usuario.
3. Queda registrado el ingreso. Al irse, lo mismo: queda la salida. Un solo botón; el servidor decide si es ingreso o salida según su turno.

**Frase clave:** *el QR prueba **dónde** está (solo existe en la pantalla de recepción) y el usuario prueba **quién** es*. Desde la casa tiene su usuario, pero no el código del momento.

### Por qué no se puede marcar desde la casa (la pregunta obligada)

- **El código es un TOTP**, el mismo mecanismo que las apps de doble factor (RFC 6238): un HMAC-SHA256 de la ventana de 30 s firmado con un secreto que solo tiene el servidor. No se guarda en ningún lado; el servidor lo recalcula para validar. Sin el secreto no se puede predecir el próximo, y uno viejo deja de servir solo (se acepta el actual y el anterior: dura 30–60 s).
- **Solo el kiosco puede pedir el código**, y se autentica como **equipo** con `KIOSCO_CLAVE` (header `X-Kiosco-Clave`, comparado con `timingSafeEqual`). No usa una sesión de usuario porque las sesiones se cierran a los 10 min sin actividad y la pantalla de recepción queda prendida todo el día. La clave del kiosco **solo** sirve para ver el código: no da acceso a ningún dato.
- **Fuerza bruta bloqueada:** 5 códigos incorrectos por usuario cada 15 minutos → 429. La chance de adivinar es 5 en un millón por cuarto de hora.
- **Ventana horaria:** el ingreso se acepta desde 30 min antes del turno hasta su fin; la salida hasta 60 min después. Una marca a las 3 AM no tiene turno al que pegarse.
- **Riesgo residual (decirlo antes de que lo pregunten):** un compañero que está en el hotel puede mandarle el código por WhatsApp a otro. Ningún sistema sin hardware biométrico lo impide del todo; lo que sí queda es la **hora exacta de cada marca**, que RRHH ve en el calendario y en el historial. Mejora a futuro: validar la red Wi-Fi del hotel o la geolocalización del celular.

### El lector de QR: qué hay adentro y por qué así

- **No hay que instalar nada.** El QR es un link: `https://<frontend>/marcar?c=123456`. La cámara nativa del celular (Android e iPhone) lo reconoce y lo abre en el navegador. No hace falta una app de lectura ni una PC con cámara en recepción.
- **El QR no tiene datos personales**, solo un número que vence. Si alguien lo fotografía, en menos de un minuto ya no sirve.
- **El QR se dibuja en el navegador del kiosco** (librería `qrcode.react`, genera un SVG). El código nunca pasa por un servicio externo de QR, como las APIs públicas que devuelven una imagen: un tercero no ve los códigos.
- **Recorrido técnico:**
  1. El kiosco pide el código a `GET /api/asistencia/codigo` con su clave y vuelve a pedirlo justo cuando vence (el servidor le dice cuántos segundos le quedan).
  2. El celular abre `/marcar?c=…`, que manda el código a `POST /api/me/asistencia` **con la sesión del empleado**.
  3. Si no había sesión, el login lo trae de vuelta a `/marcar` con el código intacto. Solo acepta rutas internas: un link armado no puede redirigir a otro sitio (*open redirect*).
  4. Después de marcar, el código se borra de la URL: recargar la página no vuelve a marcar.
- **Margen para el login:** el servidor acepta el código actual y el anterior (30–60 s), justo para que alcance aunque el empleado tenga que iniciar sesión después de escanear.
- **Plan B:** si la cámara no lee el QR o el código venció, en Mi perfil se tipean los 6 dígitos de la pantalla. Es la misma validación.

**¿Por qué un QR rotativo en la pantalla y no un QR fijo por empleado (una credencial)?** Un QR fijo es una contraseña impresa en papel: se fotografía una vez y se usa desde la casa para siempre. Acá se invierte: el QR identifica el **lugar y el momento**, y la sesión identifica a la **persona**. Además no hay que imprimir ni reponer credenciales, porque cada empleado usa el celular que ya tiene.

### Demo en vivo del QR (preparar antes)

Un celular no llega al `localhost` de la notebook: **la demo del QR va sobre producción** (Vercel + Render), no sobre el entorno local.

Antes de la defensa:
- En Render, cargar `KIOSCO_CLAVE` y crear la base desde cero con `schema.sql` y después `seed.sql`; los empleados los inserta el backend al arrancar. Hacerlo pocos días antes: el seed arma los turnos alrededor de la semana en que se crea la base.
- Desde el calendario, crear un turno para `empleado@hotel.com` que cubra la hora de la defensa.
- Abrir `/kiosco` **unos minutos antes**: el plan gratuito de Render duerme el backend y el primer pedido puede tardar cerca de un minuto. Mientras tanto el kiosco muestra "Obteniendo código…" y reintenta solo.
- Tener la sesión de `empleado@hotel.com` abierta en el celular, o la contraseña a mano.

Guion (2 minutos):
1. Kiosco en el proyector: el QR y el número cambian cada 30 segundos.
2. Escanear con el celular → "Ingreso registrado a las HH:MM".
3. Escanear otra vez enseguida → "Ya registraste tu ingreso…": el doble escaneo no cierra el turno.
4. Como RRHH, en el calendario: el turno aparece "En curso", y con un clic se ven y corrigen las horas.
5. Tipear un código viejo en Mi perfil → "Código incorrecto o vencido": sin el código del momento no se marca.

Si falla la conexión del celular: tipear el código en Mi perfil desde otra pestaña de la notebook. Demuestra la misma validación.

### Decisiones que conviene mostrar

- **Bug encontrado y corregido:** el historial se escribía al *asignar* el turno (aunque fuera futuro) y otra vez al archivarlo → horas contadas doble y turnos borrados que seguían en el historial. Ahora el historial se escribe solo al archivar, cuando ya se conoce la asistencia.
- **Un día de gracia antes de archivar:** RRHH puede corregir marcas (el empleado se olvidó de marcar, se quedó sin batería) o cargar una licencia al día siguiente, antes de que el resultado quede congelado en el historial inmutable.
- **Horas trabajadas = lo cubierto del turno:** desde `max(ingreso, inicio)` hasta `min(salida, fin)`. La tardanza y la salida anticipada descuentan; las horas extra no cuentan (serían otro concepto, con su propia aprobación). Ejemplo: turno 08–16, ingreso 08:18, salida 16:05 → 7,70 h.
- **Sin las dos marcas no hay horas.** Un turno con ingreso y sin salida queda "Sin salida": cuenta como asistencia (llegó), pero suma 0 horas. La primera versión le sumaba las horas hasta el fin programado y se corrigió antes de producción: así alcanzaba con marcar al llegar e irse. Si fue un olvido, RRHH carga la salida durante el día de gracia.
- **Zona horaria explícita:** el servidor corre en UTC y el hotel en Argentina. Toda comparación con "ahora" usa `now() AT TIME ZONE 'America/Argentina/Cordoba'`. Se detectó en pruebas que `CURRENT_DATE` (UTC) adelantaba el archivado desde las 21 h y se corrigió.
- **Privacidad:** la grilla del calendario (quién trabaja cuándo) la ve cualquier empleado, pero **la asistencia y las licencias de los demás, no**: el backend ni siquiera las envía al rol EMPLEADO. Una licencia por enfermedad es un dato de salud (Ley 25.326, art. 7). Cada uno ve lo suyo en Mi perfil.
- **Presentismo:** (asistió + sin salida) / (turnos − licencias). Las licencias no cuentan en contra: son ausencias justificadas.
- **Los reportes muestran turnos cerrados:** el historial se congela con un día de gracia, así que ayer y hoy todavía no aparecen (la pantalla lo avisa). Es a propósito: un reporte no debería cambiar después de mirarlo.

### Licencias (vacaciones, enfermedad, especiales)

- **Una sola tabla `licencias`** con tipo VACACIONES (LCT art. 150), ENFERMEDAD (art. 208) o ESPECIAL (art. 158). Las tres cumplen el mismo rol: justificar que el empleado no esté disponible en un rango de fechas. Cambian las reglas, que viven en el servicio.
- **Saldo de vacaciones:** 15 días por año, editable por empleado (la LCT escala por antigüedad: 14/21/28/35 días corridos). Solo VACACIONES descuenta.
- **Reglas:** no se superponen licencias; las vacaciones no pueden pisar turnos ya asignados (se informa cuáles, nada se borra en silencio); la enfermedad sí, porque no se planifica, y esos turnos quedan "Enfermedad" en vez de "Ausente". No se puede asignar un turno a alguien con licencia ese día.
- **Estado automático:** mientras dura la licencia el empleado pasa a Vacaciones o Enfermo, y vuelve a Activo al terminar (procedimiento `sincronizar_estado_licencias`, al arrancar, cada hora y al cargar/borrar). Nunca pisa Inactivo, Suspendido o Despedido.
- **Comentario cifrado** con AES-256-GCM, como las notas: puede tener un diagnóstico.

### Gráfico de dotación por puesto (dashboard)

- Muestra cuántos empleados **distintos** tienen turnos de cada puesto en la semana o el mes (con navegación entre períodos); el tooltip agrega turnos y asignaciones. Cada barra usa el color del puesto, el mismo del calendario.
- **Por qué sale de los turnos planificados y no del historial:** "esta semana" y "este mes" incluyen días que todavía no pasaron, y el historial solo tiene turnos cerrados. El puesto que cuenta es el **del turno** (qué rol se cubrió), no el del empleado.
- `LEFT JOIN` desde `puestos`: un puesto sin turnos aparece con 0, que también es información (falta de cobertura).
- **Carga diferida:** la librería de gráficos (~370 kB) se descarga solo al abrir el panel. El empleado que escanea el QR desde el celular no la baja.

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

**"¿Qué impide que un empleado marque el presente desde su casa?"**
→ Necesita el código de 6 dígitos que solo muestra la pantalla de recepción, y cambia cada 30 segundos (TOTP firmado por el servidor). Con 5 intentos cada 15 minutos no se puede adivinar. Lo único que no se evita es que un compañero presente le pase el código en vivo; para eso queda la hora exacta de cada marca a la vista de RRHH.

**"¿Y si le sacan una foto al QR y se la mandan a alguien?"**
→ El código vence en 30 a 60 segundos: la foto sirve solo si el otro la usa en ese momento, y además tiene que estar dentro de la ventana de su turno. Es el mismo riesgo residual del compañero que pasa el código, y la hora de cada marca queda registrada.

**"¿Hace falta una app para leer el QR?"**
→ No. El QR es un link a la aplicación web; la cámara del celular lo abre sola. El QR se genera en el navegador del kiosco, sin servicios externos.

**"¿Y si el empleado se olvida de marcar o no tiene batería?"**
→ RRHH carga o corrige las marcas desde el calendario, hasta el día siguiente al turno. Después el resultado queda fijo en el historial, que es inmutable. Si nadie cargó la salida, el turno queda "Sin salida" con 0 horas: el sistema no inventa horas que no están respaldadas por las dos marcas.

**"¿Por qué no usaron geolocalización?"**
→ El GPS del celular se falsifica con una app y pide permisos que el empleado puede negar; además es un dato de ubicación personal. El código rotativo prueba presencia sin rastrear a nadie. Quedó como mejora combinable, no como reemplazo.

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
- Asistencia (21/09/2026, 38 pruebas de API, todas OK): clave de kiosco ausente o incorrecta → 401; código con formato inválido → 400; código de hace 60 s rechazado y el de la ventana anterior aceptado; ingreso y luego salida; doble escaneo inmediato rechazado; turno que todavía no abre; empleado con licencia no puede marcar; 5 códigos incorrectos → el 6.º intento da 429 aun con el código correcto, y el bloqueo es por usuario; corrección de RRHH con horas inválidas, salida sin ingreso, turno futuro y turno archivado rechazados; el rol EMPLEADO recibe 403 al corregir.
- Asistencia en el navegador: sin sesión, el QR lleva al login y el login vuelve a `/marcar` con el código y registra el ingreso; Mi perfil muestra el turno "En curso" y después "Presente"; el calendario de RRHH muestra el estado y permite corregir; al rol EMPLEADO la API no le envía marcas ni licencias de los demás.
- Licencias (25 pruebas de API): saldo descontado, superposición, saldo insuficiente y vacaciones sobre turnos asignados rechazados; enfermedad sobre turnos aceptada; comentario guardado como `enc:...` en la base.
