# Análisis Técnico — Horarios Fijos vs. Turnos Diarios

> **Problema:** El modelo actual permite solo 1 turno/empleado/día, pero un empleado real tiene un horario fijo (ej. lunes-viernes 5h). ¿Cómo representamos eso sin crear 250 registros anuales de turno?

---

## 1. Diagnosis del Problema Actual

### Estado actual del modelo

Tabla `calendario` (turnos):
```sql
CREATE TABLE calendario (
  id SERIAL PRIMARY KEY,
  fecha DATE NOT NULL,
  hora_inicio TIME NOT NULL,
  hora_fin TIME NOT NULL,
  lugar_trabajo_id INT NOT NULL REFERENCES lugares_trabajo,
  CHECK (hora_fin > hora_inicio)
);

CREATE TABLE asignacion_horario (
  id SERIAL PRIMARY KEY,
  id_empleado INT NOT NULL REFERENCES empleados,
  id_calendario INT NOT NULL REFERENCES calendario,
  UNIQUE (id_empleado, id_calendario) -- Solo 1 turno por empleado por calendario
);
```

### Limitaciones

1. **Un turno = una fecha exacta.** Para un empleado que trabaja "lunes-viernes 09:00-14:00", habría que:
   - Crear 52 turnos (1 por semana × 5 días × 52 semanas = 260 registros anuales)
   - O crearlos bajo demanda manualmente cada semana/mes
   - Mantenerlos sincronizados si cambia el horario

2. **No hay concepto de "patrón semanal" o "recurrencia"** en la BD. El calendario es una lista plana de fechas.

3. **Impacto en reportes:** El reporte de "horas trabajadas" suma `fn_horas_trabajadas(desde, hasta)` sobre registros de `asignacion_horario_historial`. Con 260 registros/empleado/año, los reportes se vuelven lentos y consume BD sin valor.

4. **Impacto en la UX:** El admin de RRHH debe:
   - Crear un turno base (09:00-14:00)
   - Asignar ese turno a cada semana del año
   - O crear un turno por semana (tedioso)
   - O script externo que inyecte datos

### Casos de uso que no se cubren bien

- Empleado con horario fijo: "Siempre lunes-viernes 5h, sábados 8h"
- Cambio de horario: "A partir de 2026-08-01, cambia a 6h"
- Vacaciones/ausencias: "Del 20-31 de agosto no trabaja"
- Turnos rotativos: "Semana A: 09:00-14:00; Semana B: 15:00-20:00"

---

## 2. Impacto de cada solución en la arquitectura

| Aspecto | Solución A: Horarios Recurrentes | Solución B: Template Semanal |
|---|---|---|
| **Complejidad BD** | Media (nueva tabla + lógica de expansión) | Alta (rotación manual, validación compleja) |
| **Complejidad Backend** | Baja (generar instancias al consultar) | Media (árbol de decisión: qué turno hoy) |
| **Complejidad Frontend** | Media (interfaz de recurrencia) | Alta (visualización de múltiples capas) |
| **Escalabilidad** | ✅ Excelente (consultas parametrizadas) | ⚠️ Buena (pero lógica condicional) |
| **Reportes** | ✅ Trivial (no cambia estructura) | ✅ Trivial (no cambia estructura) |
| **Mantenibilidad** | ✅ Estándar (iCalendar / RRULEs) | ⚠️ Custom, difícil de razonar |
| **Defensa de tesis** | ✅ "Decisión de diseño consciente" | ⚠️ "Prototipo, validado en producción" |

---

## 3. Solución A — Horarios Recurrentes (iCalendar RRULE)

### Idea central

Un horario fijo es un **evento recurrente** que puede describirse con una RRULE (iCalendar RFC 5545). Almacenamos el patrón; el backend **expande bajo demanda** a instancias individuales en la rango de consulta.

### Modelo de datos

Nueva tabla `patrones_horarios`:
```sql
CREATE TABLE patrones_horarios (
  id SERIAL PRIMARY KEY,
  id_empleado INT NOT NULL REFERENCES empleados ON DELETE CASCADE,
  -- La recurrencia (iCalendar RRULE)
  rrule TEXT NOT NULL, -- "FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR"
  hora_inicio TIME NOT NULL,
  hora_fin TIME NOT NULL,
  lugar_trabajo_id INT NOT NULL REFERENCES lugares_trabajo,
  -- Validez del patrón
  inicio_vigencia DATE NOT NULL, -- A partir de cuándo
  fin_vigencia DATE, -- NULL = indefinido
  activo BOOLEAN DEFAULT true,
  creado_en TIMESTAMP DEFAULT now(),
  actualizado_en TIMESTAMP DEFAULT now()
);

-- Índices
CREATE INDEX idx_patrones_empleado_activo 
  ON patrones_horarios(id_empleado, activo);
CREATE INDEX idx_patrones_vigencia 
  ON patrones_horarios(inicio_vigencia, fin_vigencia);
```

### Flujo de operación

1. **Alta de patrón (POST /api/empleados/:id/horarios-recurrentes):**
   ```json
   {
     "rrule": "FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR;UNTIL=20271231",
     "hora_inicio": "09:00",
     "hora_fin": "14:00",
     "lugar_trabajo_id": 1,
     "inicio_vigencia": "2026-08-01"
   }
   ```
   Backend valida que no solape con patrones existentes, inserta y guarda.

2. **Consulta de horarios (GET /api/calendario?desde=2026-08-01&hasta=2026-08-31):**
   ```sql
   -- Seudocódigo
   SELECT * FROM patrones_horarios 
   WHERE id_empleado = $1 
   AND activo = true
   AND inicio_vigencia <= $3 
   AND (fin_vigencia IS NULL OR fin_vigencia >= $2);
   
   -- En Node: expandir cada RRULE en el rango [desde, hasta]
   -- usando librería como `rrule.js`
   ```
   El backend expande las RRULEs en instancias individuales y las devuelve como si fueran turnos.

3. **Histórico (asignacion_horario_historial):**
   - Al finalizar el día, un job cron o trigger SQL **archiva** las instancias expandidas:
   ```sql
   INSERT INTO asignacion_horario_historial 
   SELECT id_empleado, nombre, apellido, puesto, lugar, fecha, hora_inicio, hora_fin
   FROM <resultado expandido>
   WHERE fecha = CURRENT_DATE - 1;
   ```

### Ventajas

✅ **Estándar de la industria:** iCalendar es RFC 5545; cualquier calendario (Google, Outlook, Apple) lo entiende.

✅ **Escalable:** 1 registro en BD por patrón, no 260.

✅ **Flexible:** Soporta recurrencias complejas (cada 2 semanas, excepto vacaciones, hasta fecha).

✅ **Cambios simples:** Cambiar el horario es editar 1 registro; el histórico no se toca.

✅ **Histórico inmaculado:** El archivado documenta qué se trabajó, no qué se planeó.

### Desventajas

⚠️ **Complejidad de implementación:**
- Librería `rrule.js` (npm) o equivalente en tu stack.
- Validación de RRULE (sintaxis, solapamientos, límites).
- Cálculo de las excepciones (vacaciones, permisos).

⚠️ **Frontend más complejo:**
- No es un "crear turno", es "crear patrón recurrente".
- UI debe soportar selección de días, repetición, fin de vigencia.

⚠️ **Reportes requieren expansión:**
- No puedes hacer `SELECT SUM(hora_fin - hora_inicio) FROM patrones_horarios` — necesitas expandir primero.
- La expansión en memoria (Node) es rápida para años; si crece podría trasladarse a una vista materializada.

### Ejemplo de implementación backend

```javascript
// backend/src/services/patrones.services.js
import { RRule } from 'rrule';

export const expandirPatrones = (patrones, desde, hasta) => {
  const instancias = [];
  
  patrones.forEach(patron => {
    const rule = RRule.fromString(patron.rrule);
    rule.dtstart = new Date(patron.inicio_vigencia);
    if (patron.fin_vigencia) {
      rule.until = new Date(patron.fin_vigencia);
    }
    
    const occurrences = rule.between(desde, hasta);
    
    occurrences.forEach(fecha => {
      instancias.push({
        id_empleado: patron.id_empleado,
        fecha: fecha.toISOString().slice(0, 10),
        hora_inicio: patron.hora_inicio,
        hora_fin: patron.hora_fin,
        lugar_trabajo_id: patron.lugar_trabajo_id,
        fuente: 'patrón', // marker para el histórico
        id_patron: patron.id
      });
    });
  });
  
  return instancias;
};

export const obtenerHorariosEmpleado = async (idEmpleado, desde, hasta) => {
  // Patrones activos
  const patrones = await pool.query(
    `SELECT * FROM patrones_horarios 
     WHERE id_empleado = $1 AND activo = true 
     AND inicio_vigencia <= $3 AND (fin_vigencia IS NULL OR fin_vigencia >= $2)`,
    [idEmpleado, desde, hasta]
  );
  
  // Excepciones (vacaciones, cambios puntuales)
  const excepciones = await pool.query(
    `SELECT * FROM excepciones_horarios 
     WHERE id_empleado = $1 AND fecha BETWEEN $2 AND $3`,
    [idEmpleado, desde, hasta]
  );
  
  // Expandir patrones
  let instancias = expandirPatrones(patrones.rows, new Date(desde), new Date(hasta));
  
  // Aplicar excepciones (eliminar, modificar o agregar)
  // ... lógica de merge ...
  
  return instancias;
};
```

---

## 4. Solución B — Template Semanal + Override Manual

### Idea central

Un empleado tiene un **patrón semanal fijo** (lun-vie 5h, sáb 8h). Cada semana, ese patrón se aplica por defecto. Se pueden hacer overrides puntuales (vacaciones, cambios).

### Modelo de datos

Nueva tabla `template_semanal_empleado`:
```sql
CREATE TABLE template_semanal_empleado (
  id SERIAL PRIMARY KEY,
  id_empleado INT NOT NULL REFERENCES empleados ON DELETE CASCADE,
  -- Días de la semana (1=lunes, 7=domingo)
  dia_semana INT NOT NULL CHECK (dia_semana BETWEEN 1 AND 7),
  hora_inicio TIME,
  hora_fin TIME,
  lugar_trabajo_id INT,
  -- NULL en todos estos = "no trabaja ese día"
  activo BOOLEAN DEFAULT true,
  UNIQUE (id_empleado, dia_semana)
);

CREATE TABLE calendario_instancias (
  id SERIAL PRIMARY KEY,
  id_empleado INT NOT NULL REFERENCES empleados ON DELETE CASCADE,
  fecha DATE NOT NULL,
  hora_inicio TIME,
  hora_fin TIME,
  lugar_trabajo_id INT,
  -- Origen: de patrón, override manual, o turno puntual
  origen ENUM('template', 'override', 'puntual') DEFAULT 'template',
  id_override_turnos INT REFERENCES override_turnos(id),
  UNIQUE (id_empleado, fecha)
);

CREATE TABLE override_turnos (
  id SERIAL PRIMARY KEY,
  id_empleado INT NOT NULL REFERENCES empleados ON DELETE CASCADE,
  fecha_desde DATE NOT NULL,
  fecha_hasta DATE NOT NULL,
  tipo ENUM('vacacion', 'enfermedad', 'falta', 'cambio_horario'),
  hora_inicio TIME,
  hora_fin TIME,
  lugar_trabajo_id INT,
  -- NULL en hora_* = no trabaja ese día
  motivo TEXT,
  creado_por INT NOT NULL REFERENCES usuarios
);
```

### Flujo de operación

1. **Alta de template semanal (POST /api/empleados/:id/template-semanal):**
   ```json
   {
     "lunes": { "hora_inicio": "09:00", "hora_fin": "14:00", "lugar_id": 1 },
     "martes": { "hora_inicio": "09:00", "hora_fin": "14:00", "lugar_id": 1 },
     ...
     "domingo": null // No trabaja
   }
   ```

2. **Generar instancias (backend job o trigger):**
   - Cada semana (o cada día), un cron job expande el template a instancias reales.
   - Para cada fecha futura, busca el template del `dia_semana` correspondiente.
   - Crea `calendario_instancias` con `origen = 'template'`.

3. **Aplicar overrides:**
   - Si hay una `override_turnos` que cubre esa fecha:
     - Reemplazar `calendario_instancias` con los datos del override.
     - Marcar `origen = 'override'`.
   - Si es una vacación (horas = NULL):
     - Borrar la instancia o marcar con flag `ausente`.

4. **Consulta de horarios (GET /api/calendario):**
   ```sql
   SELECT * FROM calendario_instancias 
   WHERE id_empleado = $1 AND fecha BETWEEN $2 AND $3
   ORDER BY fecha;
   ```

### Ventajas

✅ **Conceptualmente simple:** "Mi horario es siempre este, excepto cuándo diga lo contrario."

✅ **UI familiar:** Es lo que usan sistemas RRHH reales (BambooHR, ADP).

✅ **Cambios de turno fáciles:** Crear un override es rápido.

✅ **Reportes sobre instancias:** Trabajas directamente con `calendario_instancias`, no requiere expansión en memoria.

### Desventajas

⚠️ **Datos redundantes:** Cada instancia existe en BD (260 registros/año). Ocupa espacio, penaliza búsquedas si no hay índice.

⚠️ **Sincronización:** El template y las instancias pueden desincronizarse. Si cambias el template, ¿qué pasa con las instancias ya creadas?
- Opción 1: Solo afecta instancias futuras (confuso para el usuario).
- Opción 2: Recalcular todas (costoso, destructivo si hay overrides).

⚠️ **Lógica de override compleja:** 
- Un override puede ser parcial (ej. "ese día trabaja 2h en lugar de 5h") o total ("no trabaja").
- Múltiples overrides en el mismo período (vacación + cambio puntual).
- La lógica de merge se vuelve un árbol de decisión frágil.

⚠️ **Histórico menos limpio:** El registro histórico es una copia de instancias + overrides, mezcla dos orígenes de verdad.

### Ejemplo de implementación backend

```javascript
// backend/src/services/calendario.services.js
export const generarInstanciasDesdeTemplate = async (idEmpleado, desde, hasta) => {
  // Obtener template semanal
  const template = await pool.query(
    `SELECT dia_semana, hora_inicio, hora_fin, lugar_trabajo_id 
     FROM template_semanal_empleado 
     WHERE id_empleado = $1 AND activo = true`,
    [idEmpleado]
  );
  
  const templateMap = {};
  template.rows.forEach(row => {
    templateMap[row.dia_semana] = row;
  });
  
  // Generar instancias
  const instancias = [];
  const fecha = new Date(desde);
  while (fecha <= new Date(hasta)) {
    const diaSemana = ((fecha.getDay() + 6) % 7) + 1; // ISO weekday (lun=1, dom=7)
    
    if (templateMap[diaSemana]) {
      const t = templateMap[diaSemana];
      instancias.push({
        id_empleado: idEmpleado,
        fecha: fecha.toISOString().slice(0, 10),
        hora_inicio: t.hora_inicio,
        hora_fin: t.hora_fin,
        lugar_trabajo_id: t.lugar_trabajo_id,
        origen: 'template'
      });
    }
    
    fecha.setDate(fecha.getDate() + 1);
  }
  
  return instancias;
};

export const aplicarOverrides = async (instancias, idEmpleado, desde, hasta) => {
  const overrides = await pool.query(
    `SELECT * FROM override_turnos 
     WHERE id_empleado = $1 
     AND fecha_desde <= $3 AND fecha_hasta >= $2`,
    [idEmpleado, desde, hasta]
  );
  
  const mapa = new Map(instancias.map(i => [i.fecha, i]));
  
  overrides.rows.forEach(override => {
    const fecha = new Date(override.fecha_desde);
    while (fecha <= new Date(override.fecha_hasta)) {
      const key = fecha.toISOString().slice(0, 10);
      
      if (override.hora_inicio === null) {
        // Vacación: eliminar instancia o marcar
        mapa.delete(key);
      } else {
        // Cambio de horario: reemplazar
        mapa.set(key, {
          id_empleado: idEmpleado,
          fecha: key,
          hora_inicio: override.hora_inicio,
          hora_fin: override.hora_fin,
          lugar_trabajo_id: override.lugar_trabajo_id || null,
          origen: 'override'
        });
      }
      
      fecha.setDate(fecha.getDate() + 1);
    }
  });
  
  return Array.from(mapa.values());
};
```

---

## 5. Comparativa Directa

| Criterio | Solución A (Recurrente) | Solución B (Template + Override) |
|---|---|---|
| **Almacenamiento BD** | 1 registro/patrón (60 bytes × 50 patrones = 3KB) | 260 registros/año (2KB × 260 = 520KB) |
| **Consulta de horarios** | Expansión en Node (rápido, <100ms) | SELECT directo (muy rápido, <10ms) |
| **Cambiar horario fijo** | Editar 1 registro | Recalcular todas las instancias futuras (riesgo) |
| **Vacaciones** | Excepciones opcionales (tabla separada) | Overrides con fechas exactas |
| **Reportes** | Requiere expansión antes de agregar | Suma directo sobre instancias |
| **Interfaz usuario** | "Crear patrón recurrente" (nuevo) | "Mi horario es..." + "excepto..." (familiar) |
| **Complejidad defensa** | "Estándar iCalendar" | "Prototipo validado" |

---

## 6. Recomendación según contexto

### Para la defensa de tesis (objetivo actual)

**Recomendación: Solución B — Template Semanal**

**Razones:**
1. **Faster time-to-market:** No necesitas librería `rrule.js`, no necesitas volver a escribir expansión/overlap detection.
2. **Menos cambios al modelo actual:** Solo agregas una tabla `template_semanal_empleado` y una `override_turnos`. El histórico no cambia.
3. **UI más familiar:** Los usuarios de RRHH entienden "mi horario es lun-vie 5h".
4. **Justificable en la defensa:** "Es un prototipo válido. La escalabilidad a recurrencias complejas está documentada en Trabajo Futuro."

**Implementación mínima:**
- [ ] Crear `template_semanal_empleado` (6 columnas)
- [ ] Crear `override_turnos` (7 columnas)
- [ ] Endpoint `POST /api/empleados/:id/template-semanal` (alta)
- [ ] Job cron que expande templates a instancias cada semana
- [ ] Modificar UI de calendario para mostrar origen (template vs. override)

**Esfuerzo:** 2-3 días de trabajo.

---

### Para una segunda versión (después de defensa)

**Recomendación: Migrar a Solución A — Recurrencias**

**Razones:**
1. **Escalable:** Soporta patrones complejos (cada 2 semanas, excepto vacaciones).
2. **Estándar:** Compatible con Google Calendar, Outlook, Apple Calendar.
3. **Limpio:** Desacopla patrón de instancias; no hay sincronización.

**Migración desde B → A:**
- Insertar en `patrones_horarios` desde los registros de `template_semanal_empleado`.
- Ejecutar una sola vez `generarInstanciasDesdeTemplate` para llenar histórico.
- Deprecar `override_turnos` (las excepciones se pasan a RRULE exceptions).

**Esfuerzo:** 1-2 días de refactor.

---

## 7. Propuesta de Implementación (Opción B — Ahora)

### Paso 1: Schema

```sql
-- Tabla de template semanal
CREATE TABLE template_semanal_empleado (
  id SERIAL PRIMARY KEY,
  id_empleado INT NOT NULL REFERENCES empleados ON DELETE CASCADE,
  dia_semana INT NOT NULL CHECK (dia_semana BETWEEN 1 AND 7), -- 1=lun, 7=dom
  hora_inicio TIME,
  hora_fin TIME,
  lugar_trabajo_id INT REFERENCES lugares_trabajo,
  activo BOOLEAN DEFAULT true,
  creado_en TIMESTAMP DEFAULT now(),
  UNIQUE (id_empleado, dia_semana)
);

-- Tabla de excepciones (vacaciones, cambios puntuales)
CREATE TABLE excepciones_horarios (
  id SERIAL PRIMARY KEY,
  id_empleado INT NOT NULL REFERENCES empleados ON DELETE CASCADE,
  fecha_desde DATE NOT NULL,
  fecha_hasta DATE NOT NULL,
  tipo VARCHAR(50) NOT NULL, -- 'vacacion', 'enfermedad', 'cambio_horario'
  hora_inicio TIME, -- NULL = no trabaja
  hora_fin TIME,
  lugar_trabajo_id INT REFERENCES lugares_trabajo,
  motivo TEXT,
  creado_por INT NOT NULL REFERENCES usuarios,
  creado_en TIMESTAMP DEFAULT now(),
  CHECK (fecha_hasta >= fecha_desde)
);

CREATE INDEX idx_template_empleado ON template_semanal_empleado(id_empleado, activo);
CREATE INDEX idx_excepciones_empleado_fecha ON excepciones_horarios(id_empleado, fecha_desde, fecha_hasta);
```

### Paso 2: Servicios backend

```javascript
// Servicio para expandir template + excepciones
export const obtenerHorariosEmpleadoV2 = async (idEmpleado, desde, hasta) => {
  // 1. Template semanal
  const { rows: template } = await pool.query(
    `SELECT dia_semana, hora_inicio, hora_fin, lugar_trabajo_id 
     FROM template_semanal_empleado 
     WHERE id_empleado = $1 AND activo = true`,
    [idEmpleado]
  );

  // 2. Excepciones que solapan el rango
  const { rows: excepciones } = await pool.query(
    `SELECT * FROM excepciones_horarios 
     WHERE id_empleado = $1 
     AND fecha_desde <= $3 AND fecha_hasta >= $2`,
    [idEmpleado, desde, hasta]
  );

  // 3. Expandir template en instancias
  const instancias = new Map();
  const templateMap = {};
  template.forEach(t => {
    templateMap[t.dia_semana] = t;
  });

  let fecha = new Date(desde);
  while (fecha <= new Date(hasta)) {
    const diaSemana = ((fecha.getDay() + 6) % 7) + 1;
    if (templateMap[diaSemana]) {
      const key = fecha.toISOString().slice(0, 10);
      const t = templateMap[diaSemana];
      instancias.set(key, {
        id_empleado: idEmpleado,
        fecha: key,
        hora_inicio: t.hora_inicio,
        hora_fin: t.hora_fin,
        lugar_trabajo_id: t.lugar_trabajo_id,
        tipo: 'template'
      });
    }
    fecha.setDate(fecha.getDate() + 1);
  }

  // 4. Aplicar excepciones
  excepciones.forEach(exc => {
    let fecha = new Date(exc.fecha_desde);
    while (fecha <= new Date(exc.fecha_hasta)) {
      const key = fecha.toISOString().slice(0, 10);
      if (exc.hora_inicio === null) {
        instancias.delete(key); // Vacación: elimina
      } else {
        instancias.set(key, {
          id_empleado: idEmpleado,
          fecha: key,
          hora_inicio: exc.hora_inicio,
          hora_fin: exc.hora_fin,
          lugar_trabajo_id: exc.lugar_trabajo_id,
          tipo: `excepcion_${exc.tipo}`
        });
      }
      fecha.setDate(fecha.getDate() + 1);
    }
  });

  return Array.from(instancias.values()).sort((a, b) => 
    new Date(a.fecha) - new Date(b.fecha)
  );
};
```

### Paso 3: Endpoints backend

```javascript
// POST /api/empleados/:id/template-semanal
router.post('/:id/template-semanal', requierePermiso('EMPLEADOS_EDITAR'), async (req, res) => {
  const { id } = req.params;
  const { lunes, martes, miercoles, jueves, viernes, sabado, domingo } = req.body;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Limpiar template anterior
    await client.query(
      'DELETE FROM template_semanal_empleado WHERE id_empleado = $1',
      [id]
    );
    
    const dias = [
      { dia: lunes, num: 1 },
      { dia: martes, num: 2 },
      { dia: miercoles, num: 3 },
      { dia: jueves, num: 4 },
      { dia: viernes, num: 5 },
      { dia: sabado, num: 6 },
      { dia: domingo, num: 7 }
    ];
    
    for (const d of dias) {
      if (d.dia) {
        await client.query(
          `INSERT INTO template_semanal_empleado 
           (id_empleado, dia_semana, hora_inicio, hora_fin, lugar_trabajo_id)
           VALUES ($1, $2, $3, $4, $5)`,
          [id, d.num, d.dia.hora_inicio, d.dia.hora_fin, d.dia.lugar_id]
        );
      }
    }
    
    await client.query('COMMIT');
    res.json({ ok: true, message: 'Template actualizado' });
  } catch (err) {
    await client.query('ROLLBACK');
    responderError(res, err);
  } finally {
    client.release();
  }
});

// POST /api/empleados/:id/excepciones-horarios
router.post('/:id/excepciones-horarios', requierePermiso('EMPLEADOS_EDITAR'), async (req, res) => {
  const { id } = req.params;
  const { fecha_desde, fecha_hasta, tipo, hora_inicio, hora_fin, lugar_id, motivo } = req.body;

  // Validar: fecha_desde <= fecha_hasta
  if (new Date(fecha_desde) > new Date(fecha_hasta)) {
    return responderError(res, httpError(400, 'fecha_desde debe ser <= fecha_hasta'));
  }

  try {
    await pool.query(
      `INSERT INTO excepciones_horarios 
       (id_empleado, fecha_desde, fecha_hasta, tipo, hora_inicio, hora_fin, lugar_trabajo_id, motivo, creado_por)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [id, fecha_desde, fecha_hasta, tipo, hora_inicio || null, hora_fin || null, lugar_id || null, motivo, req.usuario.id]
    );
    res.status(201).json({ ok: true });
  } catch (err) {
    responderError(res, err);
  }
});
```

### Paso 4: Cambios en frontend

En `/empleados`:
- Al crear/editar empleado, mostrar tab "Horario" con:
  - Selector visual (lun-dom, cada uno con hora_inicio, hora_fin, lugar).
  - Botón "Guardar template".
  - Lista de excepciones con botón "+ Agregar excepción".

En `/calendario`:
- Filtrar instancias según `obtenerHorariosEmpleadoV2`.
- Badge verde "Template", azul "Excepción" para visualizar el origen.

---

## 8. Decisión

**¿Qué elegimos?**

Propongo **Solución B (Template + Excepciones)** porque:

1. ✅ Es implementable en **2-3 días**.
2. ✅ No requiere dependencias nuevas (ni `rrule.js`).
3. ✅ Es justificable en la defensa ("prototipo validado").
4. ✅ La migración a Solución A (iCalendar) es sencilla si crece.
5. ✅ El modelo del dominio es claro: "cada empleado tiene un horario base + excepciones".

**Próxima acción:** ¿Aprobás esta dirección? Si sí, armamos las tablas, los endpoints y la UI.

---

**Documento generado:** 2026-07-26
**Estado:** Propuesta en análisis, awaiting feedback.
