# Análisis: documento de tesis (.docx) vs. proyecto real

> **Fecha del análisis:** 2026-08-22
> **Archivo analizado:** `Tesis Julio Madero HotelYacanto.docx` (3.3 MB, 23 imágenes,
> última edición 20/11/2025 — **9 meses de antigüedad** respecto de hoy)
> **Método:** el .docx se descomprimió y se extrajo el XML completo (texto de las
> 23 imágenes embebidas + todo el contenido), ya que no había pandoc/LibreOffice
> disponibles en este entorno. Se leyó el documento entero, no un resumen.
>
> Este documento es un **checklist de trabajo**, no una versión editada de la tesis.
> No se tocó el .docx — cada hallazgo indica dónde está y qué cambiar.

> **Estado de la corrección:** ver checklist al final de cada sección. Resuelto = ya
> corregido en el .docx; Pendiente = falta pasar el texto acordado.

**El resumen en una frase:** el documento describe fielmente el proyecto tal como
estaba el **20 de noviembre de 2025** — 3 pantallas, 2 roles, sin cifrado, sin RBAC
real, desplegado solo en la red del hotel. El proyecto de **hoy** tiene 8 pantallas,
3 roles con RBAC en base de datos, cifrado AES-256-GCM, sesión deslizante, y está
desplegado en la nube (Vercel + Render). La brecha no es de detalle: es de una
generación completa de decisiones de arquitectura.

---

## Checklist de progreso

- [x] 0.1 — placeholders sin completar
- [x] 0.2 — tono "vamos a usar React"
- [x] 0.3 — copy-paste ficha CU02
- [x] 0.4 — DATE → TIME en diccionario de datos
- [x] Sección 5 — Diagrama de Despliegue
- [x] Sección 3 — Arquitectura del sistema + Especificación de Software
- [x] Sección 4.1 — características del rol RRHH
- [x] Sección 4 — Especificaciones de seguridad completa, 1.1 a 9. Punto 8
      "Seguridad Física" resuelto con la opción A (sección eliminada) por
      no tener respuesta explícita — si preferías la opción B (una línea sobre
      el proveedor de hosting), avisá y la agrego
- [x] Trabajo Futuro — punto de auditoría + bloqueo de intentos + consentimiento
      informado (texto dado, pendiente confirmar que se pegó)
- [x] Capítulo "Especificaciones de auditoría" (7 subsecciones) — texto de
      reemplazo dado más abajo en esta respuesta, pendiente pegar
- [x] Sección 6 — "Propuesta General": preferencia de horarios BORRADA (sin
      re-alcanzar); evaluación de desempeño y recomendación de personal movidas
      a Trabajo Futuro; "reseñas internas" fusionada con el campo `notas` real
- [x] Sección 7 — nuevo capítulo "Módulos del sistema" (después de "Propuesta
      General"), cubre Configuración, Usuarios, Mi Perfil, CV adjunto y sesión
      deslizante en un mapa de los 8 módulos (texto dado, pendiente pegar)
- [x] Capítulo "Prototipo de la Aplicación Web": módulo 5 "Mi Perfil" agregado
      después del 4 (Empleados), mismo estilo detallado que 1-4 (texto dado)
- [x] Capítulo "Prototipo de la Aplicación Web": módulo 6 "Reportes" agregado
      (texto dado); requiere BORRAR "3.1 Generación de Reportes desde el
      Calendario" (dentro del módulo 3) y "4.1 Generación de Reportes de
      Empleados" (dentro del módulo 4) — quedan consolidados acá. Captura de
      esta pantalla ya la tiene Julio
      Por decisión de Julio NO se agregan los módulos 7-Usuarios ni
      8-Configuración al capítulo Prototipo (quedan cubiertos por el capítulo
      "Módulos del sistema")
- [x] Feature nueva (código, no docx): la pestaña Dotación de /reportes ahora
      muestra 6 tarjetas de resumen (total, activos, vacaciones, enfermos,
      inactivos, antigüedad promedio) — reemplaza al mockup 4.1 viejo.
      Verificada local; falta push a producción para poder capturarla
- [ ] Sección 1 — DER y Diccionario de Datos (visual, pendiente)
- [ ] Sección 2 — Capturas de pantalla (visual, pendiente)
- [ ] Sección 8/9 — inconsistencias menores y ortografía (pendiente)

---

## 0. Lo primero que hay que arreglar — son minutos, no horas

### 0.1 Dos placeholders de plantilla sin completar 🔴🔴🔴

Esto es lo más urgente de todo el análisis. En **Especificación de Software**, punto
2 ("Tecnologías utilizadas"), el texto dice **literalmente**:

> "**JavaScript / Node.js (o reemplazar según lo que uses)**"

Y unas líneas después, en **Especificación de Hardware**, punto 1:

> "**Node.js (o tecnología backend utilizada)**"

Son instrucciones de una plantilla que nunca se completaron con el dato real. Si un
miembro del tribunal llega a esta página, el mensaje que recibe es "esto no se
revisó". Es el arreglo de mayor retorno de todo este documento: reemplazar ambas
por "Node.js 20 + Express 4" y listo.

### 0.2 Tono de borrador en primera persona 🟠

En la misma sección: "Framework de Front-end: **vamos a usar** el framework de
REACT". Es lenguaje de planificación ("vamos a usar"), no de una tesis que describe
un sistema ya construido. Cambiar a "Se utilizó React 19" (pretérito, tercera
persona, como el resto del documento).

### 0.3 Copy-paste sin corregir en la ficha del Caso de Uso 2 🟠

La ficha "Trazo fino" de **CU02 (Asignar turno)** arrastra texto del CU01:

- El campo dice **"Nombre del Caso de Uso: Registrar Empleados"** — debería decir
  "Asignar turno".
- El pie dice **"Archivo: Ficha caso de uso 1"** — debería decir "caso de uso 2".
- La fecha de creación no coincide entre las dos fichas del mismo caso de uso: el
  "Trazo grueso" de CU02 dice **20/11/2025**, el "Trazo fino" del mismo CU02 dice
  **20/06/2025**.

### 0.4 Error de tipo de dato en el Diccionario de Datos 🟡

Tabla `calendario`, campo `hora_inicio`: el documento dice **`DATE`**. Debería decir
`TIME` (así está en `hora_fin`, la fila de abajo, y así es en el schema real).

---

## 1. El Diagrama Entidad-Relación describe un modelo que ya no existe

Es la imagen `media/image11.png`, dentro de "Diagrama de Entidad-Relación". Muestra
**5 entidades**: `puestos`, `lugares_trabajo`, `empleados`, `calendario`,
`asignacion_horario`.

El **Diccionario de Datos** (texto, sección posterior) describe las mismas 5 tablas
con el mismo detalle campo por campo. Ambos —diagrama e imagen— son consistentes
entre sí, pero **ninguno de los dos refleja el schema real**, que tiene 13 tablas.

### Comparación campo por campo de `empleados`

| Campo en el docx | Campo real (schema.sql) |
|---|---|
| `nombre` VARCHAR(100) | `nombre` VARCHAR(100) ✅ igual |
| — (no existe `apellido` separado) | `apellido` VARCHAR(100) |
| `edad` INT | **eliminado** — se reemplazó por `fecha_nacimiento` (cifrada) y la edad se calcula en Node al vuelo, para no tener un dato que envejece mal |
| `id_puesto` INT FK | `id_puesto` INT FK ✅ igual |
| `id_lugar` INT FK | `id_lugar` INT FK (el docx lo llama `id_lugar`, el schema real `id_lugar` también — ✅) |
| `activo` BOOLEAN | **eliminado** — reemplazado por `id_estado` FK a una tabla `estados` con 6 valores (Activo, Inactivo, Vacaciones, Enfermo, Suspendido, Despedido), mucho más expresivo que un booleano |
| — | `dni` TEXT (cifrado) |
| — | `telefono` TEXT (cifrado) |
| — | `direccion` TEXT (cifrado) |
| — | `notas` TEXT (cifrado) |
| — | `id_usuario` INT FK (vínculo a la cuenta de acceso) |
| — | `fecha_creacion` TIMESTAMP |

### Tablas enteras que faltan en el docx

El diagrama y el diccionario **no mencionan ninguna de estas siete tablas**, que
son las que sostienen todo lo que el documento promete en la sección de seguridad:

- `usuarios` (email, password_hash, activo, debe_cambiar_password)
- `roles`, `permisos`, `roles_permisos` — el RBAC real vive acá, en datos, no en código
- `usuarios_roles`
- `estados` (catálogo)
- `empleados_cv` (el binario del CV, cifrado, con `PK = FK` a `empleados`)
- `asignacion_horario_historial` (historial inmutable y desnormalizado para reportes)

Esto **no es un detalle**: el documento promete en la sección de seguridad "modelo
de permisos basado en roles" y "hash seguro (bcrypt)" para las contraseñas, pero el
diagrama que se supone que sustenta esas promesas no tiene ni tabla de usuarios ni
tabla de roles. El DER y el capítulo de seguridad se contradicen entre sí dentro
del mismo documento.

**Recomendación:** el `docs/schema-interactivo.html` que ya tenés en el repo (dark
theme, ERD navegable, con los 13 nodos reales, marcando qué campos están cifrados)
es exactamente el diagrama actualizado que le falta a la tesis. Se puede exportar
una captura de esa página para reemplazar `image11.png`, o referenciar el archivo
directamente si el formato de entrega lo permite.

---

## 2. Las capturas de pantalla son mockups de Figma de una versión que no se construyó así

Este es el hallazgo más visual de todos. Las 8 imágenes de la sección "Prototipo de
la Aplicación Web" (`image14`, `image5`, `image15`, `image8`, `image13`, `image10`,
`image12`, y una más de reportes) **no son capturas del sistema funcionando**: son
wireframes de Figma de la etapa de diseño. Se nota en detalles como un texto que
dice literalmente *"Demo: Haz clic en cualquier botón para ingresar"* en la pantalla
de login — eso es un mockup interactivo de prototipo, no una pantalla real.

Comparación pantalla por pantalla:

### 2.1 Login (`image14`)

| Mockup del docx | Sistema real |
|---|---|
| Dos botones: "Ingresar como Administrador" / "Ingresar como Empleado" | Un solo botón "Ingresar"; el rol lo determina la cuenta en la base (RBAC), no una elección del usuario al loguear |
| Texto "Demo: Haz clic en cualquier botón para ingresar" | Login real contra `POST /api/auth/login`, valida credenciales de verdad |

El mockup refleja el diseño de auth **mock** que tenía el proyecto en sus primeras
semanas (login simulado con `setTimeout`, sin backend real) — es interesante como
evidencia de evolución, pero como "esto es lo que hace el sistema" ya no es cierto.

### 2.2 Navegación (todas las pantallas)

El mockup muestra **3 ítems de menú**: Inicio, Calendario, Empleados.

El sistema real tiene **7 ítems**, condicionados por permiso: Inicio, Empleados,
Calendario, Usuarios, Reportes, Mi perfil, Configuración. Faltan en el mockup
cuatro módulos enteros: Usuarios, Mi Perfil, Reportes (como pantalla propia) y
Configuración (que ni existía como concepto en noviembre 2025).

### 2.3 Dashboard (`image5`)

| Mockup | Real |
|---|---|
| "Ocupación del Hotel: 78%" como indicador | No existe — ese dato es del sistema ALOJA (reservas), no de este sistema de RRHH; nunca se implementó ni tenía sentido implementarlo acá |
| 5 tarjetas: Total, Activos, Vacaciones, Inactivos, Turnos Hoy | 4 tarjetas: Total, Activos, Vacaciones, Turnos de hoy — más listas de próximos turnos, cumpleaños próximos y top de antigüedad, que el mockup no contempla |

### 2.4 Calendario (`image15`)

Estructuralmente el más parecido: vista semanal con turnos como bloques de color,
filtro por empleado/puesto. La diferencia es de implementación, no de concepto —
razonable, porque el calendario fue de los primeros módulos en construirse y no
cambió mucho su idea central. Las fechas del mockup (semana del 17 al 23 de
noviembre de 2025) delatan cuándo se hizo.

### 2.5 Alta de empleado (`image10`) — la brecha más grande de todas

| Campo en el mockup | Sistema real |
|---|---|
| Nombre, Apellido, Email, Teléfono, Puesto, Estado, Fecha de Ingreso (manual) | Nombre, Apellido, Email, **DNI (obligatorio)**, Teléfono, Dirección, Puesto, **Lugar de trabajo**, Estado, CV adjunto |
| — | Fecha de creación es automática (`DEFAULT CURRENT_TIMESTAMP`), no un campo manual |
| No hay ningún campo de contraseña ni mención de cuenta | **El alta crea la cuenta de usuario automáticamente**, en la misma transacción: contraseña inicial derivada del DNI, `debe_cambiar_password = true`, y se muestra una única vez |

Esta es la funcionalidad más importante que se agregó *después* de este mockup —
el flujo unificado empleado+usuario — y el documento no tiene ni una línea sobre
ella, ni en el prototipo ni en los casos de uso.

### 2.6 Reportes (`image8`, `image12`)

El mockup los muestra como **dos modales separados**, cada uno colgando de su
pantalla de origen ("Reportes de Calendario" abre desde `/calendario`, "Reportes de
Empleados" desde `/empleados`).

El sistema real tiene **una pantalla propia** `/reportes` con tres tabs (Historial,
Horas trabajadas, Dotación), filtros compartidos y export CSV — no depende de abrir
un modal desde otro lado.

### 2.7 Listado de empleados (`image13`)

Le faltan las columnas **DNI** y **Lugar de trabajo**, que sí están en la tabla real.

---

## 3. Arquitectura y stack: simplificado a 3 capas genéricas

La imagen `image2.png` ("Arquitectura del Sistema — Diagrama de Estructuras")
muestra tres cajas: Interfaz Web → Lógica de Negocio → PostgreSQL.

El texto que la acompaña describe lo mismo: **Presentación / Backend / Base de
Datos**, sin mencionar más.

La arquitectura real, documentada en `docs/ReadmeBackend.md`, tiene **cinco capas**
explícitas: `routes → middlewares → controllers → services → queries`. La capa de
`middlewares` es justamente donde vive todo lo que el capítulo de seguridad del
docx promete (autenticación JWT, RBAC, validaciones) — y el diagrama de arquitectura
no la muestra como capa propia.

**Versiones:** el docx dice "PostgreSQL 13 o superior"; el proyecto corre
PostgreSQL 16 (`docker-compose.yml`).

---

## 4. Seguridad: lo prometido vs. lo implementado

Esta sección del docx es la que se compara mejor porque, a diferencia de las
demás, **está escrita en tiempo futuro/condicional** ("se recomienda", "se
propone", "el sistema debe") en vez de describir algo ya construido — lo cual la
hace más fácil de actualizar sin reescribir todo, solo hay que pasarla a pretérito
donde ya está cumplida y marcar honestamente lo que no.

### 4.1 Ya implementado y mejor de lo que el docx promete ✅

| Promesa del docx | Estado real |
|---|---|
| "Contraseña almacenada mediante hash seguro (bcrypt o equivalente)" | ✅ bcrypt, cost 10 |
| "Tiempo máximo de sesión activa" + "Expiración automática por inactividad" | ✅ implementado hace poco: JWT de 15 min + corte por inactividad de 10 min con aviso y renovación silenciosa — el docx lo pedía como dos ítems separados y el sistema real los resuelve con el mismo mecanismo |
| "Prevención de SQL Injection mediante consultas preparadas" | ✅ 100% de las queries parametrizadas |
| "Usuario de BD con permisos mínimos necesarios" | ✅ rol `hotel_app` sin DDL — verificado que `DROP TABLE` falla |
| "Acceso restringido solo al servidor interno" (para Postgres) | ✅ puerto 5432 solo en `127.0.0.1` |

### 4.2 Prometido y NO implementado ❌ — hay que decidir: implementar o re-alcanzar

- **"Bloqueo temporal tras múltiples intentos fallidos"** de login — no existe rate
  limiting ni bloqueo por intentos. Es una promesa concreta y verificable; un
  tribunal la puede probar en vivo intentando loguear mal seis veces.
- **Auditoría completa** (toda la sección "Especificaciones de auditoría", 7
  subsecciones: accesos, actividad del admin, gestión de turnos, generación de
  reportes, integridad, conservación, visualización) — no existe ningún log de
  auditoría de accesos ni de IP. Lo único parecido que existe es el historial
  inmutable de turnos (`asignacion_horario_historial`), que audita *qué se
  trabajó*, no *quién entró al sistema ni cuándo*.
- **Registro de IP/dispositivo por sesión** — no se guarda.

### 4.3 Un error conceptual que el propio proyecto ya corrigió en otro documento 🟠

Sección "4.2 Protección del servidor PostgreSQL": *"Encriptación de la contraseña
del usuario administrador."*

Las contraseñas se **hashean** (bcrypt), no se encriptan — son dos operaciones
distintas: el hash es irreversible (para verificar), la encriptación es reversible
(para poder leer el dato original con la clave). Este es exactamente el matiz que
`docs/defensa.md` explica con una tabla comparativa para que el tribunal no
confunda los dos términos. Vale la pena alinear el docx con esa distinción — hoy
dice literalmente lo que el propio proyecto identificó como el error más común que
puede preguntar el tribunal.

### 4.4 RBAC: 2 roles en el docx, 3 en el sistema real 🟠

Toda la sección de seguridad (y también los casos de uso) habla de dos roles:
**Administrador** y **Empleado**. El rol **RRHH**, que existe en el sistema real con
permisos intermedios (gestiona empleados y calendario, pero no administra cuentas
de usuario ni el establecimiento), no aparece mencionado en ningún lugar del
documento.

---

## 5. La contradicción más grande: dónde vive el sistema

El capítulo **"Diagrama de Despliegue"** es explícito y repetido:

> "El sistema se encuentra desplegado dentro de la **red privada interna** del
> hotel [...] Es accesible **únicamente desde la red interna** para mayor
> seguridad [...] **No existe exposición directa a internet**, reduciendo riesgos
> de seguridad."

El sistema real está desplegado en **Vercel (frontend) + Render (backend y
PostgreSQL)** — infraestructura en la nube pública, accesible desde cualquier
lugar con internet, no solo desde la red del hotel.

Esto no es un error menor de redacción: es un **cambio de estrategia completo**
que el documento nunca reconoce. Y tiene una consecuencia directa sobre el
argumento de seguridad de esa misma sección — el docx apoya buena parte de su
argumento de seguridad en "no hay exposición a internet", y ese argumento ya no
es válido tal como está desplegado hoy.

La buena noticia es que el proyecto real tiene un argumento de reemplazo mejor,
que ya está escrito en `docs/defensa.md`: el cifrado AES-256-GCM en la capa de
aplicación significa que **aunque la base esté en la nube, el proveedor nunca ve
un dato personal en claro**. Ese argumento es más fuerte que "está aislado en una
red local" porque no depende de un perímetro de red — conviene que el docx lo
adopte en vez del argumento viejo.

---

## 6. Funcionalidades documentadas que no se construyeron

Aparecen en "Propuesta General" y no tienen ningún rastro en el código:

- **Evaluaciones de desempeño** realizadas por jefes sobre cada empleado.
- **Preferencias de horario/temporada** del empleado.
- **Sistema de recomendación** de personas para futuros puestos (referidos).
- **Consentimiento informado explícito** en el alta (checkbox o similar) — hoy el
  alta no pide consentimiento, aunque el cifrado y el RBAC sí cumplen la parte de
  "medidas técnicas" de la Ley 25.326.

Ninguna de estas cuatro es grave por sí sola, pero conviene decidir explícitamente
para cada una: ¿se implementa, o se re-alcanza como "Trabajo Futuro"? Dejarlas
como promesa incumplida sin comentario es lo único realmente riesgoso.

---

## 7. Funcionalidades reales que el documento no menciona en absoluto

Para que la tesis refleje el nivel real del proyecto, faltan capítulos o párrafos
sobre:

- **Cifrado AES-256-GCM** de datos personales (todo el capítulo 2 de
  `docs/defensa.md` no tiene equivalente en el docx).
- **Módulo Configuración** (ABM de puestos y lugares, exclusivo de ADMINISTRADOR,
  con borrado protegido que cuenta cuántos registros usan cada ítem).
- **Módulo Usuarios** (gestión de cuentas: editar rol/estado, resetear contraseña).
- **Módulo Mi Perfil** (autogestión: el empleado edita sus propios datos de
  contacto, nunca puesto/estado).
- **CV adjunto**, cifrado, almacenado en PostgreSQL (BYTEA) — con su propia
  justificación de diseño en `docs/analisis-cv-postgres.md` que vale la pena
  resumir en la tesis.
- **Sesión deslizante** (JWT 15 min + inactividad 10 min + renovación silenciosa),
  que de hecho *supera* lo que el propio docx pedía en su sección de seguridad.
- **Rol RRHH** como tercer nivel de permisos.
- **Historial inmutable desnormalizado** de turnos, con su justificación (un
  reporte pasado no debe cambiar si después se renombra un puesto).
- El **deploy real** en Vercel + Render.

---

## 8. Otras inconsistencias menores dentro del propio documento

- El requerimiento funcional de CU02 dice "franja horaria (mañana, tarde, noche)"
  como si los turnos fueran de horario fijo predefinido; el sistema real usa
  horarios libres (`hora_inicio`/`hora_fin` en formato TIME, sin franjas fijas).
- "El sistema debe permitir a **la administradora** crear un calendario" — género
  inconsistente con el resto del documento, que usa "el Administrador".
- Numeración de alternativas en las fichas de casos de uso no es uniforme: a veces
  "5.a." (con punto), a veces "6a." (sin punto) para el mismo nivel de alternativa.
- La bibliografía tiene algunas entradas con espaciado irregular entre el título y
  la fuente (ej. la entrada de "Aloja Software" del motor de reservas) —
  recomiendo revisarla visualmente en Word, porque no puedo garantizar si es un
  error real o un artefacto de cómo se extrajo el texto para este análisis.

---

## 9. Ortografía y gramática — hallazgos puntuales

- **"Proteccion de datos personales"** (heading) — falta la tilde en "Protección".
- Varias oraciones largas sin comas donde el español las pide, ej.: *"la cantidad
  de empleados que hay en cada categoría depende de varios factores, la
  temporada del año, la capacidad de alojamiento..."* — es una sola oración con
  demasiadas ideas encadenadas; se lee mejor partida en dos.
- *"la información de contacto de empleados y exempleados es fácil de perder"* —
  "exempleados" debería llevar guion: "ex-empleados" (o separado, "ex empleados",
  según el criterio editorial que se use en el resto del documento — ahí mismo se
  usa "empleados viejos" en otro párrafo para lo mismo; conviene unificar el término).
- Revisar visualmente en Word: dado que la extracción fue automática vía XML, no
  puedo garantizar al 100% que cada salto de línea o espacio doble sea un error
  real y no un artefacto de mi proceso — lo anterior son los que se ven claramente
  en el texto plano, pero una pasada del corrector ortográfico de Word sobre el
  documento completo sigue siendo necesaria antes de entregar.

---

## 10. Orden sugerido para editar

**Primero — minutos, alto impacto (sección 0 completa):**
1. Completar los dos placeholders literales ("o reemplazar según lo que uses")
2. Pasar "vamos a usar React" a pretérito
3. Corregir el copy-paste de la ficha CU02 (nombre, archivo, fecha)
4. `DATE` → `TIME` en el diccionario de datos

**Segundo — el argumento más frágil del documento:**
5. Diagrama de Despliegue: reescribir reconociendo el deploy en la nube
   (Vercel + Render) y reemplazar el argumento de "red aislada" por el de
   "cifrado en la aplicación, el proveedor nunca ve datos en claro"

**Tercero — lo más visible para un tribunal:**
6. Reemplazar el DER (`image11.png`) por una versión actualizada de las 13 tablas
   — el `schema-interactivo.html` del repo ya es ese diagrama, solo falta
   exportarlo o adaptarlo a imagen estática
7. Actualizar o retomar capturas de pantalla reales (no mockups de Figma) para
   las 8 pantallas actuales — ver la propuesta de la sección 11

**Cuarto — completar la sección de seguridad con honestidad:**
8. Marcar qué se implementó (tabla §4.1) y decidir, para cada ítem no
   implementado (§4.2 y §6), si se construye antes de la defensa o se re-alcanza
   como Trabajo Futuro
9. Corregir "encriptación de contraseña" → "hash de contraseña"
10. Agregar el rol RRHH en todas las menciones de RBAC

**Quinto — cuando haya tiempo:**
11. Sumar párrafos sobre lo que el código tiene y el docx no menciona (§7)
12. Revisión de ortografía/gramática completa con el corrector de Word
13. Diagrama de arquitectura: pasar de 3 a 5 capas

---

## 11. Propuesta: un lugar donde vivan las capturas actualizadas

El mismo problema que resolvió `docs/schema-interactivo.html` para el esquema de
base de datos (una única fuente visual, siempre al día, navegable) aplica acá:
las capturas de pantalla del docx quedaron congeladas en noviembre porque no había
dónde mantenerlas actualizadas más que pegándolas directo en Word.

Propongo `docs/capturas-interactivo.html`, mismo estilo visual que el archivo del
schema (dark theme, panel lateral) para que se sientan como parte del mismo kit de
documentación:

- Una miniatura por cada una de las 8 pantallas reales del sistema, agrupadas por
  rol (qué ve ADMIN / RRHH / EMPLEADO) — reutiliza el argumento de RBAC que ya
  está en `defensa.md`.
- Click en una miniatura → la imagen a tamaño completo más 2-3 líneas de qué
  mostrar en la demo (sacadas de lo que ya existe en `pasos-a-presentar.md`).
- Cada imagen es un archivo `.png` versionado en `docs/capturas/`, así que
  actualizar una captura es reemplazar un archivo — no hay que tocar HTML ni Word.
- Un botón "última actualización: <fecha>" por imagen, para notar de un vistazo
  cuál quedó vieja.

Las capturas en sí **no las puedo generar yo en este entorno** — el navegador que
uso para verificar cambios no está renderizando visualmente en esta sesión (sin
compositing, no puedo tomar screenshots reales, solo leer el DOM). Se pueden
conseguir de dos formas: que las tomes vos navegando el sistema real y las
compartas, o pedirme que las genere en una sesión donde el panel de vista previa
esté visible.

¿Armamos ese archivo ahora con placeholders para que vayas completando las
capturas, o preferís primero decidir qué pantallas mostrar y en qué orden?
