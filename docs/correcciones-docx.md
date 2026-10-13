# Correcciones antes de la defensa (15/10)

Todo lo que hay que corregir en el informe, la presentación, la base de Render y el repo. Primero la
lista para ir tildando; abajo, el detalle de cada punto con el texto exacto.

**Informe — cómo buscar:** en Word, Ctrl+F con la frase de **Buscar** (no distingue mayúsculas). Todas
las frases están verificadas contra el documento. Si alguna no aparece, probá con menos palabras: el
texto se leyó de la exportación de Drive y puede diferir algún espacio. No incluyas viñetas ni números
de lista.

## Checklist

**Informe (.docx)**

- [ ] 1. Red interna o nube (§5.1, §10.4.2, §10.5) y servidor propio (§8.2.4, §8.3)
- [ ] 2. Bloqueo por intentos fallidos de login (§10.1.1)
- [ ] 3. Consentimiento, autogestión y contraseñas (§5.1)
- [ ] 4. Auditoría (§9)
- [ ] 5. XSS, CSRF y subida de archivos (§10.6)
- [ ] 6. Capa de datos (§8.1)
- [ ] 7. Módulo Reportes (§5.2)
- [ ] 8. Login y panel de inicio, Figuras 19 y 20 (§12)
- [ ] 9. CU01 Registrar Empleado (§7.1)
- [ ] 10. CU02, copiado del CU01
- [ ] 11. Diccionario de datos y Figura 18 (§11)
- [ ] 12. Trabajo futuro que ya está hecho (§14.3)
- [ ] 13. Pagos salariales: sumarlo al trabajo futuro (§2.3, §14)
- [ ] 14. Nombres y cargos de los entrevistados (Anexo A)
- [ ] 15. Intentos anteriores de control de asistencia (§2.4)
- [ ] Prioridad baja (5 frases)
- [ ] Al terminar, actualizar el índice (clic derecho sobre el índice → Actualizar campos)

**Presentación (.pptx)**

- [ ] Instalar Material Icons, incrustar las fuentes y exportar un PDF de respaldo
- [ ] L2 — "se triplica" sin comillas
- [ ] L4, L6, L9 — cargos de los entrevistados, iguales al informe
- [ ] L5 — intentos anteriores (o agregarlos al informe, punto 15)
- [ ] L7 — nota: "más de 25 años"
- [ ] L9 — "transcritas en el anexo"
- [ ] L11 — tilde en "está" y coherencia con el hardware
- [ ] L13 — agregar Usuarios y sacar "Ocho módulos"
- [ ] L14 — "sin costo de infraestructura"
- [ ] L16 — "copias de respaldo periódicas"
- [ ] L17 — qué ve el rol Empleado
- [ ] L19 — quién crea las cuentas
- [ ] L20 — "Registro e historial"
- [ ] L21 — "Garantiza la presencia física"
- [ ] L26 — tarjeta "Liquidación de haberes"
- [ ] L24 — actualizar la guía de la demo y **ocultarla**

**Render (13/10)**

- [ ] Revisar el vencimiento de la base, las variables y el usuario de `DATABASE_URL`
- [ ] Recrear la base (schema + seed) y cambiar la clave de `hotel_app`
- [ ] Actualizar `DATABASE_URL` y ver en Logs el seed de 20 empleados
- [ ] Cerrar el acceso externo a la base
- [ ] Cargar la clave del kiosco en el navegador de la defensa y probar el QR con Ana

**Repo**

- [ ] Corregir `docs/defensa.md` (preparación de la demo)
- [ ] Commitear `docs/schema-interactivo.html`

**Entrega**

- [ ] Carta del comitente: impresa en hoja membretada, firmada, con aclaración y sello, dirigida al
      director de carrera

**Ensayo**

- [ ] Repasar las preguntas probables del final

---

## Informe — prioridad alta

Primero lo que el tribunal puede marcar como contradicción o como algo que el sistema no hace.

### 1. ¿Red interna o nube? (§5.1, §10.4.2, §10.5)

En tres lugares el documento dice que el sistema es interno y no sale a internet, pero §8.4 y la lámina 16
dicen que está en la nube y se usa desde cualquier lado (la asistencia se marca con el celular). Lo que
vale es lo de §8.4.

**Buscar:** `Restricción del acceso externo` (§5.1) → reemplazar el ítem completo por:

> Acceso protegido desde internet: el sistema se publica en la nube para poder usarse desde cualquier
> equipo o teléfono, por lo que la protección no depende de una red cerrada sino de la autenticación, el
> control de acceso por roles, el cifrado de los datos personales y las comunicaciones cifradas (HTTPS).

**Buscar:** `Acceso restringido solo al servidor interno del hotel` (§10.4.2) → reemplazar por:

> La base de datos es un servicio gestionado en la nube; solo el backend se conecta a ella, con
> credenciales propias y conexión cifrada (TLS).

**Buscar:** `Encriptación de la contraseña del usuario administrador` (§10.4.2) → reemplazar por:

> Las contraseñas de todos los usuarios se guardan como hash bcrypt, que es irreversible: nunca en texto
> plano ni cifradas.

Esta es importante: tu propia respuesta preparada (defensa.md §1) es "las contraseñas no se encriptan, se
hashean". Si el tribunal lee "encriptación de la contraseña", te contradice.

**Buscar:** `No se expone la base de datos directamente a internet` (§10.4.2) y
`No hay exposición de la base de datos a internet` (§10.5) → dejalas **solo si** restringís el acceso
externo en Render (ver la sección de Render, paso 5). Si no, borralas.

**Buscar:** `Acceso al sistema limitado a la red privada del hotel` (§10.5) → reemplazar por:

> El sistema está publicado en internet para poder usarse desde cualquier equipo o teléfono; todo acceso
> requiere iniciar sesión.

**Buscar:** `Firewall configurado para permitir únicamente el tráfico interno` (§10.5) → reemplazar por:

> La plataforma de hosting solo expone el backend, y únicamente por HTTPS.

**Buscar:** `Router y switch protegidos con contraseña administrativa` y
`Segmentación: área administrativa separada` (§10.5) → borrar las dos líneas (son de la red del hotel,
que el sistema no usa), o anteponerles: "Como buena práctica para la red interna del hotel,
independiente del sistema:".

**1d — Servidor propio (§8.2.4 y §8.3).** El informe especifica un servidor en el hotel (i5, 8 GB, UPS)
y una red interna para alojarlo, pero el sistema corre en la nube y la lámina 11 dice que el hotel no
quiere invertir en hardware. Hay que presentarlo como alternativa:

**Buscar:** `El sistema requiere de un equipo servidor que aloje la aplicación web` → reemplazar el
párrafo por:

> El sistema funciona hoy en la nube y no requiere un servidor en el hotel. Si en el futuro se decidiera
> alojarlo en las instalaciones propias, el equipo servidor debería cumplir con lo siguiente.

**Buscar:** `Para el funcionamiento del sistema en un servidor local o en la intranet del hotel` →
reemplazar por: "Para alojar el sistema en un servidor propio, como alternativa a la nube, se requiere:"

**Buscar:** `El sistema debe operar dentro de la red interna del hotel` → reemplazar la oración por:

> Para usar el sistema alcanza con conexión a internet en cada equipo; la red interna solo sería
> necesaria si se alojara en un servidor propio.

### 2. Bloqueo por intentos fallidos de login (§10.1.1)

No existe para el login (solo para el código de asistencia), y §14.5 lo pone como trabajo futuro.

**Buscar:** `Bloqueo temporal tras múltiples intentos fallidos` → reemplazar por:

> Las cuentas desactivadas no pueden iniciar sesión, y la contraseña inicial debe cambiarse en el primer
> ingreso. El límite de intentos está implementado para el código de asistencia (cinco intentos fallidos
> cada quince minutos por empleado); para el inicio de sesión queda previsto como trabajo futuro (ver 14.5).

**Buscar:** `Validación estricta de contraseña` → reemplazar por:

> Contraseñas de al menos 8 caracteres; al cambiarla, la nueva debe ser distinta de la actual.

**Buscar:** `Contraseña almacenada mediante hash seguro` → cambiar "(bcrypt o equivalente)" por
"(bcrypt, con salt automático y factor de costo 10)".

### 3. Consentimiento, autogestión y contraseñas (§5.1)

**Buscar:** `Consentimiento informado` → reemplazar el ítem por:

> Consentimiento informado: el tratamiento de los datos de los empleados se apoya en la relación laboral.
> La Ley 25.326 (art. 5, inc. 2, ap. d) no exige consentimiento para los datos que derivan de una relación
> contractual y son necesarios para cumplirla. El registro del consentimiento explícito dentro del
> sistema queda previsto como trabajo futuro (ver 14.5).

**Buscar:** `Se brindará un módulo de autogestión` → reemplazar esa oración por:

> El módulo Mi Perfil permite a cada empleado consultar sus datos y sus turnos, y actualizar sus datos de
> contacto; la rectificación de los datos laborales y la supresión se solicitan a RRHH.

**Buscar:** `Políticas de contraseñas robustas` → reemplazar por (la "renovación periódica" no existe):

> Contraseñas de al menos 8 caracteres guardadas con hash; la contraseña inicial es de un solo uso y el
> sistema obliga a cambiarla en el primer ingreso.

### 4. Auditoría (§9)

Está escrita como si existiera (IP de cada acceso, valor anterior y nuevo, reportes generados) y la
lámina 26 y §14.5 la ponen como trabajo futuro.

**Buscar:** `Las siguientes reglas de auditoría se aplican` → agregar **antes** de ese párrafo:

> Este capítulo especifica la auditoría prevista para el sistema. En la versión actual están implementados
> el historial inmutable de turnos (quién trabajó, cuándo, con qué asistencia y cuántas horas), el registro
> del usuario que carga cada licencia y los mecanismos de integridad del punto 9.5. El registro de accesos
> y de las operaciones de los usuarios (puntos 9.1 a 9.4) forma parte del trabajo futuro descripto en 14.5.

**Buscar:** `El Administrador es el único usuario autorizado para realizar modificaciones` → cambiar ese
comienzo por "El Administrador y RRHH son los usuarios autorizados a modificar datos del sistema" (el
resto de la oración queda igual).

### 5. Protección contra ataques comunes (§10.6)

**Buscar:** `Prevención de XSS sanitizando entradas del usuario` → reemplazar por:

> Prevención de XSS: la interfaz está hecha con React, que escapa todo el contenido al mostrarlo; el
> sistema no inserta HTML escrito por el usuario.

**Buscar:** `Prevención de CSRF mediante tokens únicos` → reemplazar por:

> Protección frente a CSRF por diseño: la sesión viaja en el encabezado Authorization (token JWT) y no en
> una cookie, así que un sitio externo no puede hacer peticiones en nombre del usuario.

**Buscar:** `Restricción de subida de archivos (si se agrega en el futuro)` → reemplazar por:

> Restricción de subida de archivos: el CV solo admite PDF o DOCX de hasta 5 MB, validado en el servidor.

---

## Informe — prioridad media

### 6. Capa de datos (§8.1)

**Buscar:** `Los datos personales de los empleados (teléfono, dirección, DNI, fecha de nacimiento).`
(la oración quedó cortada, sin verbo) → reemplazar por:

> Los datos personales de los empleados (teléfono, dirección, DNI, fecha de nacimiento y notas), el
> comentario de las licencias y el archivo del CV se guardan cifrados: la base solo almacena el texto
> cifrado.

**Buscar:** `Asignacion_horario_historial` → en esa lista de tablas, agregar debajo `Licencias` y
`Empleados_cv`.

### 7. Módulo Reportes (§5.2)

**Buscar:** `Historial de turnos, horas trabajadas por empleado y dotación de personal` → reemplazar el
párrafo por:

> Historial de turnos con su asistencia, horas trabajadas y presentismo por empleado, licencias tomadas en
> un período, saldo de vacaciones de todo el personal (ordenado por días sin tomar) y dotación por puesto y
> lugar de trabajo. Se filtran por fecha, empleado, puesto, asistencia y tipo de licencia, y se exportan a
> CSV.

### 8. Prototipo: login y panel de inicio (§12)

**Buscar:** `y seleccionar el tipo de acceso` → reemplazar el párrafo por:

> El usuario ingresa su correo electrónico y su contraseña. No elige un tipo de acceso: el sistema toma el
> rol de la cuenta y muestra solo los módulos que ese rol tiene permitidos. En el primer ingreso obliga a
> cambiar la contraseña inicial.

**Buscar:** `cuenta con acceso restringido únicamente a la visualización` (ítem Empleado) → agregar antes
un ítem:

> RRHH: gestiona empleados, turnos, licencias y reportes; consulta las cuentas de acceso pero no las
> modifica.

**Buscar:** `Porcentaje de ocupación del hotel` → borrar la línea (dependería de integrar ALOJA, que es
trabajo futuro).

**Buscar:** `Próximos turnos programados` → agregar debajo:

> Empleados por puesto y gráfico de dotación por puesto, por semana o por mes
>
> Próximos cumpleaños y empleados con mayor antigüedad

**Revisar las Figuras 19 y 20:** si son capturas del prototipo de Figma (con selector de acceso o % de
ocupación), reemplazalas por capturas del sistema real.

### 9. CU01 — Registrar Empleado (§7.1)

En el sistema el rol Empleado se asigna solo, la cuenta se crea en la misma operación y no existen cupos
por puesto. La ficha dice lo contrario.

Ficha de trazo fino:

| Buscar | Cambiar por |
|---|---|
| `rol asignado y puesto disponible` | rol Empleado y su cuenta de acceso creada |
| `Debe haber un puesto de trabajo libre en la empresa` | El correo electrónico ya pertenece a otra cuenta |
| `no asigna un rol al empleado` (aparece **2 veces**: en Fracaso y en la alternativa 5.a) | borrar las dos |
| `El administrador Asigna un rol al empleado` | El sistema asigna el rol Empleado y genera la cuenta de acceso con una contraseña inicial |
| `carga los datos sobre la preferencia laboral` | carga los datos laborales: puesto, lugar de trabajo y estado |
| `Le asigna un puesto de trabajo` | El sistema guarda el empleado y su cuenta, y muestra la contraseña inicial una única vez |
| `No hay un puesto de trabajo libre` (alternativa 6a) | 6a. El correo ya está registrado. 6a.1 El sistema informa que pertenece a otra cuenta. 6a.2 Se cancela el caso de uso |

Explosión del caso de uso (7.1.1):

| Buscar | Cambiar por |
|---|---|
| `Ingresar edad` | Ingresar DNI y fecha de nacimiento (la edad la calcula el sistema). |
| `Verificar que no exista un empleado duplicado` | Verificar que el correo electrónico no pertenezca a otra cuenta (es la identidad de acceso y es único). |
| `Guardar el nuevo empleado en la base de datos` | Guardar el empleado y crear su cuenta de acceso en la misma operación: si algo falla, no se guarda ninguno de los dos. |
| `El puesto no está disponible` | El correo ya pertenece a otra cuenta → se informa y no se registra el empleado. |

### 10. CU02 — quedó copiado del CU01

**Buscar:** `ID: CU02` → la celda de al lado dice "Nombre del Caso de Uso: Registrar Empleados": cambiar
a **Asignar Turno**. En esa misma tabla, **Buscar:** `Archivo: Ficha caso de uso 1` (es la **2.ª**
coincidencia) → "Ficha caso de uso 2". Unificar también la fecha de creación: el trazo grueso dice
20/11/2025 y el fino 20/06/2025.

### 11. Diccionario de datos (§11)

**Tabla empleados**

- **Buscar:** `La tabla empleados representa el núcleo principal` → en la lista de abajo, cambiar "Edad"
  por "Fecha de nacimiento y DNI (cifrados)".
- **Buscar:** `nombre del empleado` → en esa fila y en la de apellido, Tipo `TEXT` → `VARCHAR`.
- **Buscar:** `edad del empleado` → Descripción: "Fecha de nacimiento, cifrada; la edad se calcula".
- Agregar estas filas:

| Campo | Tipo | Longitud | PK | FK | Nulo | Descripción |
|---|---|---|---|---|---|---|
| id_usuario | INT | - | - | SI | SI | Cuenta de acceso del empleado (única) |
| dni | TEXT | - | - | - | SI | DNI, cifrado con AES-256-GCM |
| telefono | TEXT | - | - | - | SI | Teléfono, cifrado |
| direccion | TEXT | - | - | - | SI | Dirección, cifrada |
| notas | TEXT | - | - | - | SI | Notas internas, cifradas |
| fecha_creacion | TIMESTAMP | - | - | - | NO | Fecha de alta, base de la antigüedad |
| dias_vacaciones_anuales | INT | - | - | - | NO | Días de vacaciones por año (15 por defecto) |

**Tabla puestos** — **Buscar:** `Nombre del puesto` → agregar la fila:

| color | VARCHAR | 7 | - | - | NO | Color con el que el calendario muestra el puesto (#rrggbb) |
|---|---|---|---|---|---|---|

**Tabla asignacion_horario** — **Buscar:** `Validacion para reportes` → en esa fila (archivado), Nulo `SI`
→ `NO` y Descripción: "Indica si el turno ya pasó al historial (evita duplicarlo)". Agregar:

| Campo | Tipo | Longitud | PK | FK | Nulo | Descripción |
|---|---|---|---|---|---|---|
| hora_ingreso | TIME | - | - | - | SI | Hora real de ingreso (marca de asistencia) |
| hora_egreso | TIME | - | - | - | SI | Hora real de salida (marca de asistencia) |

**Tabla nueva: licencias** — **Buscar:** `Diagrama de entidad-relación de la base de datos` → antes del
título "Diagrama de Entidad-Relación", agregar:

> **Tabla correspondiente a las licencias**
>
> La tabla licencias registra las vacaciones, enfermedades y licencias especiales de cada empleado. Las
> tres comparten tabla porque cumplen el mismo rol: justificar que el empleado no esté disponible en un
> rango de fechas. Solo las vacaciones descuentan del saldo anual.

| Campo | Tipo | Longitud | PK | FK | Nulo | Descripción |
|---|---|---|---|---|---|---|
| id | INT | - | SI | - | NO | Identificador |
| id_empleado | INT | - | - | SI | NO | Empleado |
| tipo | VARCHAR | 12 | - | - | NO | VACACIONES, ENFERMEDAD o ESPECIAL |
| fecha_desde | DATE | - | - | - | NO | Primer día |
| fecha_hasta | DATE | - | - | - | NO | Último día (no anterior a fecha_desde) |
| comentario | TEXT | - | - | - | SI | Observaciones, cifradas (pueden incluir datos de salud) |
| fecha_registro | TIMESTAMP | - | - | - | NO | Cuándo se cargó |
| id_usuario_registra | INT | - | - | SI | SI | Usuario que la cargó |

Y después de esa tabla, una oración de cierre:

> El diccionario detalla las tablas del dominio. Las tablas de seguridad (usuarios, roles, permisos y sus
> relaciones), el historial inmutable de turnos y el CV adjunto se describen en los capítulos 8 y 10 y
> figuran en el diagrama de entidad-relación.

**Revisar la Figura 18 (diagrama ER):** tiene que incluir licencias y las marcas de asistencia. Para
reemplazarla, abrí `docs/schema-interactivo.html` (ya actualizado, fondo blanco), tocá **Ajustar**, hacé
clic en un espacio vacío del lienzo para que no quede ninguna tabla resaltada, y capturá el diagrama.

### 12. Trabajo futuro que ya está hecho (§14.3)

El informe lista como futuro cosas que el sistema ya hace (y la lámina 23 las muestra). Borrar estas
tres líneas:

- **Buscar:** `Cantidad de horas trabajadas por empleado o sector.`
- **Buscar:** `Índices de presentismo.`
- **Buscar:** `Antigüedad del personal.`

Quedan "Comparación entre temporadas alta y baja" y "Tendencias de carga laboral", que sí son futuro.

### 13. Requerimiento sin respuesta: pagos salariales (§2.3)

**Buscar:** `registrar el control de pagos salariales` → el relevamiento lo pide, pero el sistema no lo
hace y no figura en el trabajo futuro. Es una pregunta probable. Agregar en §14 un punto nuevo, antes de
"Conclusión del Trabajo Futuro" (y actualizar el índice):

> **Liquidación de haberes.** El sistema ya calcula las horas efectivamente trabajadas por empleado y
> período, que son el insumo de la liquidación. El cálculo de sueldos y el control de pagos quedaron
> fuera del alcance de esta entrega y son la continuación natural del módulo de reportes.

### 14. Nombres y cargos de los entrevistados (Anexo A)

- **Buscar:** `Fabricio Leonel` (aparece **2 veces**, en el diálogo) → "Fabrizio Leonel", como en el
  título.
- Unificar los cargos con la presentación (ver la sección de la presentación, más abajo):
  `Encargado de operaciones del hotel` y `quien se desempeña en el rol de gerente general` (Julio
  Ricardo Madero); `Entrevista a Micaela Domínguez, empleada Administrativa` (2.ª coincidencia; la
  primera es el índice).

### 15. Intentos anteriores de control de asistencia (§2.4)

La lámina 5 cuenta más que el informe. Si lo de la lámina es así, **Buscar:**
`Anteriormente se intentó implementar sistemas de control de acceso` y agregar después de ese párrafo:

> Antes de las tarjetas se probaron planillas para firmar, que quedaban sin completar o se firmaban todas
> juntas al final de la semana. El equipamiento de lectura, además, exigía un mantenimiento con costo
> sostenido, y las tarjetas se perdían, se prestaban o se extraviaban.

---

## Informe — prioridad baja

| Buscar | Cambiar por |
|---|---|
| `una franja horaria (mañana, tarde, noche)` | una franja horaria con hora de inicio y hora de fin |
| `JavaScript/Node.js: validaciones básicas` | JavaScript: validaciones básicas… (Node.js corre en el backend) |
| `Control de roles (Administrador / Empleado)` | Control de roles (Administrador, RRHH y Empleado) |
| `Acceso total a empleados, turnos y reportes.` | Acceso total: empleados, turnos, reportes, cuentas de acceso y estructura del establecimiento. |
| `Se realizan copias de seguridad comprimidas` | El sistema cuenta con un script de copia de seguridad comprimida (pg_dump) que conserva las últimas 7 copias, y con un procedimiento de restauración probado. |

---

## Presentación (.pptx)

### Antes que nada: los íconos

20 de las 27 láminas dibujan los íconos con la fuente **Material Icons** (son texto, no imágenes). La
fuente **no está incrustada** en el .pptx y **tampoco está instalada en tu PC**. En cualquier PowerPoint
sin esa fuente, en vez del ícono aparece la palabra: `event_busy`, `credit_card_off`, `qr_code_2`…
(Si la venías mirando en Drive, ahí se ve bien porque Google sí tiene la fuente).

1. Descargá **Material Icons** de Google Fonts (gratis) e instalala.
2. Abrí el .pptx: los íconos tienen que verse como íconos.
3. Archivo → Opciones → Guardar → **Incrustar fuentes en el archivo** → "Incrustar todos los
   caracteres". Guardá.
4. **Exportá también un PDF** y llevalo en un pendrive: el PDF lleva los íconos dibujados y se ve igual
   en cualquier máquina. Es el respaldo seguro si la PC de la facultad no tiene la fuente.

### Correcciones por lámina

**Contradicen lo que el tribunal va a ver en la demo**

- **L17 Quién ve qué — EMPLEADO:** "Solo lo suyo: sus turnos…". En la app el empleado ve el
  **calendario completo** (los turnos de todos); lo que no ve es la asistencia ni las licencias de los
  demás. En el paso 7 de la demo se ve. → "Sus datos, su legajo y su asistencia. Del resto del personal
  solo ve la grilla de turnos, sin asistencia ni licencias."
- **L13 La propuesta:** los 8 módulos no coinciden con el menú de la app (Inicio, Empleados, Calendario,
  Usuarios, Reportes, Mi perfil, Configuración): falta **Usuarios**, y Asistencia y Licencias no son
  ítems del menú. → agregar "Usuarios" y cambiar "Ocho módulos, cada uno accesible según el rol de quien
  entra." por "Los módulos principales, cada uno accesible según el rol de quien entra." (además el
  informe dice *nueve*; sin número no se contradicen).
- **L21 Asistencia — "Vencimiento inmediato":** "Garantiza la presencia física: no se puede marcar
  desde afuera". "Garantiza" lo desmiente tu propia nota (el compañero que pasa el código). → "Vence en
  segundos: para marcar hay que estar frente a la pantalla de recepción." Y en "Código dinámico":
  "Una pantalla en recepción muestra un código que cambia cada 30 s".
- **L19 Usuarios — "Control centralizado":** "Solo el administrador crea, edita o desactiva cuentas".
  Las cuentas las crea el sistema al dar de alta al empleado, y el alta la puede hacer RRHH. → "Solo el
  administrador edita, desactiva o resetea cuentas".

**Afirmaciones que no se sostienen en producción**

- **L16 Cómo está hecho:** "copias de respaldo periódicas". En Render (plan gratis) no hay respaldo
  automático. → "con copias de respaldo", o hacer un `pg_dump` de producción antes de la defensa.
- **L14 — "desplegado sin costo de infraestructura":** cierto para la demo, pero el plan gratis duerme
  el backend y la base gratuita de Render tiene fecha de vencimiento. Si preguntan por usarlo de verdad,
  queda flojo. → "Hoy corre en planes gratuitos; operarlo en serio cuesta pocos dólares por mes y no
  requiere comprar hardware."
- **L20 Calendario — "Registro e historial":** "Queda registrado quién quedó asignado y cuándo" se lee
  como auditoría (quién hizo el cambio y cuándo), que es trabajo futuro. → "Cada turno pasa al historial
  con quién lo trabajó y su asistencia".

**No coinciden con el informe (el tribunal lo tiene en la mano)**

- **Cargos de los entrevistados** — elegí el real y usalo igual en todos lados:
  - Julio Ricardo Madero: L6 "encargado de operaciones", L9 "Gerente Administrativo", informe §1
    "gerente general", Anexo "Encargado de operaciones del hotel".
  - Micaela Domínguez: L4 "Asistente Administrativa", L9 "Secretaria Administrativa", Anexo "empleada
    Administrativa".
  - Fabrizio Leonel: el Anexo lo escribe "Fabrizio" en el título y "Fabricio" en el diálogo (ver punto
    14 del informe).
- **L5 Ya se intentó resolver:** las planillas para firmar, el equipamiento instalado en las puertas,
  el costo de mantenimiento y las tarjetas que se pierden **no están en el relevamiento** del informe
  (§2.4 solo menciona las tarjetas y los múltiples accesos). Agregalo al informe (punto 15).
- **L11 Relevamiento tecnológico:** "La empresa no esta dispuesta a hacer una inversión de hardware"
  (falta la tilde en *está*). El informe §8.3 pide un servidor con UPS en el hotel: se contradicen
  (ver punto 1d del informe).
- **L2:** "La dotación se triplica" y L6 "×3,5". Y está entre comillas como si fuera una cita, pero
  nadie lo dijo. → sin comillas: "La dotación más que se triplica varias veces al año."
- **L26 Trabajo futuro:** el informe no menciona la liquidación de sueldos, aunque §2.3 la pide como
  requerimiento (ver punto 13 del informe). Conviene una quinta tarjeta: "Liquidación de haberes — Las
  horas trabajadas ya se calculan; falta el cálculo de sueldos y el control de pagos."

**Menores**

- **L7 (nota):** "funciona hace 25 años": desde 1999 son 27 → "más de 25 años".
- **L9:** "transcritas completas en el anexo": el anexo tiene extractos breves → "transcritas en el
  anexo del informe".

### L24 Guía de la demo

- **Todavía no está oculta** (lo verifiqué en el archivo). Clic derecho en la miniatura → Ocultar.
- **Paso 3 (superposición), receta concreta:** asignar a **Ana Gómez** al turno de **Cocinero
  09:00–17:00 del 15/10** → se rechaza porque se superpone con su turno de Mucama 10:00–18:00.
- **Paso 5 (QR):** con `empleado2@hotel.com` (Ana, turno 10:00–18:00) si la defensa es entre las 09:30
  y las 18:00. Juan recién puede marcar desde las 16:30. El kiosco pide la clave (`KIOSCO_CLAVE`) una
  vez y la recuerda en ese navegador: cargala antes de la defensa en la PC que vas a usar.
- **Paso 7:** "mostrar que solo ve lo suyo" → "el menú solo tiene Calendario y Mi perfil; en el
  calendario ve los turnos de todos, pero no la asistencia ni las licencias de los demás".

---

## Render — carga de la base (13/10)

**No hay SSH:** la base de Render se conecta con `psql` y la *External Database URL*
(Postgres → Connect → External). Con Docker Desktop abierto no hace falta instalar psql.

1. **Antes, en el panel de Render:**
   - Postgres: si muestra fecha de vencimiento (plan gratis), que no caiga antes del 15/10.
   - Backend → Environment: que estén `KIOSCO_CLAVE` y `DATA_ENCRYPTION_KEY`, y que `DATABASE_URL` use
     el usuario `hotel_app` (`postgresql://hotel_app:...`). Si usa el usuario dueño de la base, lo de
     "usuario de permisos mínimos" (§8.4 y §10.4.2) no es cierto en producción.

2. **Conectarse** (en PowerShell, pegando la URL externa):

   ```
   docker run --rm -it -v D:/tesis/backend/database:/sql postgres:16 psql "EXTERNAL_DATABASE_URL"
   ```

3. **Recrear la base** (dentro de psql, conectado como el usuario dueño, no como hotel_app):

   ```
   DROP SCHEMA public CASCADE;
   CREATE SCHEMA public;
   \i /sql/schema.sql
   \i /sql/seed.sql
   ALTER ROLE hotel_app PASSWORD 'una-clave-nueva-larga';
   ```

   El `ALTER ROLE` es porque **el repo es público** y `schema.sql` tiene la contraseña de `hotel_app` a la
   vista.

4. **Los empleados NO se cargan con INSERT:** los inserta el backend, cifrados con la clave de Render.
   Actualizá `DATABASE_URL` en el backend con la clave nueva
   (`postgresql://hotel_app:CLAVE_NUEVA@HOST/BASE`, mismo host y base que la actual). Al guardar, Render
   reinicia el servicio y carga los empleados. En Logs tiene que aparecer
   `Seed: 20 empleados insertados con datos personales cifrados…`.
   Por qué no a mano: un INSERT con datos en claro la app lo muestra igual (lo que no empieza con `enc:`
   pasa sin descifrar), así que no te darías cuenta, pero en la base quedarían sin cifrar.

5. **Cerrar la base a internet:** Postgres → Access Control → dejá solo tu IP, o ninguna. Con eso "no se
   expone la base de datos a internet" (§10.4.2 y §10.5) pasa a ser cierto. Si no dejás ninguna IP, la
   demo de psql (cifrado y adulteración GCM) hacela sobre Docker local.

6. **Si en el ensayo ensuciás los datos**, repetí los pasos 3 y 4 (sin el `ALTER ROLE`): el seed es
   determinístico y da exactamente lo mismo.

### Demo del QR el 15/10 (simulé la rotación del seed)

| Usuario | Turno del 15/10 | Puede marcar |
|---|---|---|
| `empleado2@hotel.com` — Ana Gómez, Mucama | 10:00–18:00 | de 09:30 a 18:00 |
| `empleado@hotel.com` — Juan Pérez, Cocinero | 17:00–22:00 | recién desde las 16:30 |

- Si la defensa es entre las 09:30 y las 18:00, usá **Ana** y no hace falta crear nada.
- Si querés que el ingreso no figure con horas de tardanza, creá desde el calendario un turno corto que
  cubra la hora de la defensa y asignáselo a Juan (no choca con su turno de las 17:00).
- Esperable: si cargás la base el 13, los turnos del 13 y del 14 ya traen marcas simuladas (el seed
  simula asistencia hasta el 15). El día 15 queda todo coherente, y los turnos de esa mañana figuran sin
  marcar porque nadie escaneó.

---

## Repo

- **`docs/defensa.md`, sección 7b, "Demo en vivo del QR (preparar antes)":**
  - "Hacerlo pocos días antes: el seed arma los turnos alrededor de la semana en que se crea la base"
    quedó viejo: desde el commit `6f57d72` las fechas del seed son fijas. → "Las fechas del seed son
    fijas: la base se puede cargar con anticipación."
  - "Crear un turno para `empleado@hotel.com` que cubra la hora de la defensa" → con el seed actual,
    `empleado2@hotel.com` (Ana) ya tiene turno de 10:00 a 18:00 el 15/10.
  - Sumar los pasos de Render de este archivo: se entra con psql (no SSH), los empleados los carga el
    backend al reiniciar y la clave de `hotel_app` se cambia.
- **Sin commitear:** `docs/schema-interactivo.html` (el diagrama actualizado) y este archivo. El repo es
  **público**: si no querés que esta lista de contradicciones del informe quede a la vista, no la
  commitees.
- **Credenciales de demo publicadas:** `seed.sql` y `pasos-a-presentar.md` tienen las contraseñas de
  demo, así que cualquiera puede entrar a producción como `admin@hotel.com`. Con datos ficticios para la
  defensa está bien; **antes de cargar datos reales del hotel** hay que borrar esos usuarios y cambiar las
  claves.

---

## Preguntas probables que salieron de esta revisión

**"Chrome dejó de actualizarse en Windows 7 en 2023. ¿Funciona igual?"** (L11) → Sí: la última versión
para Windows 7 es Chrome 109, y el frontend se compila con Vite 7 apuntando a Chrome 107 o superior.
Contracara honesta: un Windows sin parches es un riesgo para el equipo, no para los datos, que viven en
el servidor y viajan cifrados. La recomendación es actualizar esas PCs.

**"¿Cuánto cuesta usarlo de verdad?"** (L14) → Hoy corre en planes gratuitos (Vercel y Render). Para
operarlo en serio, backend y base pasan a planes pagos de pocos dólares por mes, o a un VPS. En ningún
caso hace falta comprar hardware ni mantener un servidor en el hotel.

**"El relevamiento pide control de pagos salariales. ¿Dónde está?"** (§2.3) → El sistema ya calcula las
horas efectivamente trabajadas por empleado y período, que son el insumo de la liquidación. El cálculo de
sueldos y el control de pagos quedaron fuera del alcance y están en el trabajo futuro (punto 13).

**"¿Por qué no se bloquea la cuenta tras varios intentos de login?"** (§10.1.1) → El límite está donde
más hacía falta: el código de asistencia tiene 6 dígitos y se adivinaría por fuerza bruta, por eso admite
5 intentos cada 15 minutos. Las contraseñas tienen 8 caracteres o más y bcrypt hace que cada intento
cueste alrededor de 100 ms. Para el login queda como trabajo futuro (14.5).

**"El relevamiento habla de no perder los CV de los postulantes. ¿Dónde se cargan?"** (§2) → El CV se
adjunta al legajo del empleado, cifrado. Un registro de postulantes que todavía no trabajan en el hotel
quedó fuera del alcance; va junto con la recomendación de candidatos del trabajo futuro (14.6).
