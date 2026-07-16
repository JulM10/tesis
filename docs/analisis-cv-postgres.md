# Análisis técnico: almacenamiento de CVs en PostgreSQL

**Fecha:** 16/07/2026
**Decisión:** los CVs (PDF/DOCX) se guardan como binario (`BYTEA`) dentro de PostgreSQL, eliminando la dependencia de Supabase Storage.

---

## 1. Contexto y motivación

La versión anterior guardaba el binario en Supabase Storage (bucket privado) y en Postgres solo la referencia (`cv_ruta`). Para la presentación de la tesis se decidió migrar el binario a Postgres por estas razones:

| Criterio | Supabase Storage | PostgreSQL (BYTEA) |
|---|---|---|
| Dependencia externa | Sí (internet + servicio activo) | No — todo corre en Docker local |
| Riesgo el día de la defensa | El free tier pausa proyectos inactivos | Ninguno: demo autocontenida |
| Configuración | 3 variables de entorno + bucket | Cero configuración extra |
| Consistencia de datos | Binario y referencia pueden desincronizarse (archivo huérfano) | Transaccional: el CV vive y muere con el empleado (`ON DELETE CASCADE`) |
| Escala | Ilimitada en la práctica | Adecuada para el caso (≤ 5MB por CV, ~20 empleados) |

**Escala del problema:** 20 empleados × 5MB máximo = 100MB peor caso. Muy por debajo de cualquier límite práctico de Postgres (una columna `BYTEA` admite hasta 1GB por valor).

---

## 2. Diseño: tabla separada `empleados_cv`

El binario NO se agregó como columna de `empleados`, sino en una tabla 1:1:

```sql
CREATE TABLE empleados_cv (
  id_empleado INT PRIMARY KEY REFERENCES empleados(id) ON DELETE CASCADE,
  nombre      VARCHAR(200) NOT NULL,   -- nombre original del archivo
  mime        VARCHAR(100) NOT NULL,   -- application/pdf | .docx
  archivo     BYTEA NOT NULL,          -- el binario
  actualizado TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

**Por qué tabla separada y no columna en `empleados`:**

1. **Rendimiento:** los listados (`GET /api/empleados`, vista `vw_empleados_detalle`) nunca arrastran megabytes de binario por la red. La única query que lee `archivo` es la de descarga.
2. **Relación 1:1 garantizada:** `PRIMARY KEY = FK` fuerza un CV por empleado a nivel de esquema.
3. **Integridad referencial:** `ON DELETE CASCADE` elimina el CV automáticamente al borrar el empleado — desapareció la lógica de "borrado best-effort" del storage externo.
4. **Migración futura simple:** la tabla es el "adaptador"; cambiar de proveedor toca solo las queries de CV.

La vista `vw_empleados_detalle` expone `cv_nombre` y `cv_actualizado` vía `LEFT JOIN`, por lo que **el contrato de la API no cambió y el frontend no requirió ninguna modificación**.

---

## 3. Cambios realizados (por archivo)

### Eliminado
- `backend/src/services/storage.services.js` — adaptador completo de Supabase (68 líneas)
- Dependencia `@supabase/supabase-js` en `package.json` (y ~40 paquetes transitivos del lockfile)
- Variables `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `SUPABASE_BUCKET` de `.env` y `.env.example`
- Mensajes `CV.NO_CONFIGURADO` y `CV.ERROR_STORAGE` (ya no hay servicio externo que falle)

### Modificado
- **`database/schema.sql`**
  - `empleados`: se quitaron `cv_ruta`, `cv_nombre`, `cv_mime`, `cv_actualizado`
  - Nueva tabla `empleados_cv`
  - `vw_empleados_detalle`: `LEFT JOIN empleados_cv` para seguir exponiendo `cv_nombre`/`cv_actualizado`
- **`src/queries/empleados.queries.js`**
  - `SET_CV`: `INSERT ... ON CONFLICT DO UPDATE` (upsert atómico: alta y reemplazo en una operación)
  - `GET_CV`: lee `nombre, mime, archivo` de `empleados_cv`
  - `CLEAR_CV`: `DELETE` en vez de `UPDATE ... SET NULL`
  - Nueva `EXISTE_EMPLEADO` para validar el 404 de empleado
- **`src/services/empleados.services.js`**
  - `subirCV`: sin subida remota ni limpieza de archivo anterior — el upsert reemplaza el binario en la misma fila
  - `descargarCV`: devuelve el `BYTEA` directo (el driver `pg` lo entrega como `Buffer`, mismo tipo que devolvía el download de Supabase)
  - `eliminarCV`: un solo `DELETE`
  - `deleteEmpleado`: se eliminó la limpieza manual del storage (lo resuelve el `CASCADE`)

### Sin cambios
- Rutas, controladores, middleware de multer (validación de MIME y 5MB), RBAC
- **Todo el frontend** (perfil, empleados): el contrato de la API se mantuvo idéntico
- `me.services.js` (delega en el servicio de empleados)

---

## 4. Flujo resultante

```
Subida:    multipart/form-data → multer (memoria, valida PDF/DOCX ≤5MB)
           → upsert en empleados_cv (binario + nombre + mime)
Consulta:  vw_empleados_detalle expone cv_nombre (sin binario)
Descarga:  SELECT archivo → Content-Disposition: attachment (nunca URL pública,
           siempre pasa por el backend con sesión + permisos RBAC)
Borrado:   DELETE en empleados_cv (o CASCADE al borrar el empleado)
```

La seguridad no cambió: el archivo jamás se expone por URL; el acceso está protegido por JWT + permisos (`EMPLEADOS_VER` / `EMPLEADOS_EDITAR` para terceros, o el propio usuario vía `/api/me/cv`).

---

## 5. Limitaciones aceptadas y mejora a futuro

**Limitaciones de guardar binarios en la BD (aceptadas para esta escala):**
- El dump/backup de la BD crece con los archivos
- Cada descarga pasa por la memoria del proceso Node y del pool de Postgres
- No hay CDN ni streaming parcial

**Mejora a futuro (mencionar en la defensa):** si el sistema escalara (cientos de empleados, archivos más grandes, múltiples adjuntos), el binario debería moverse a un object storage (AWS S3, Cloudflare R2, Supabase Storage). Gracias al diseño actual, esa migración implica:
1. Reemplazar las 3 queries de CV por llamadas a un adaptador de storage
2. Volver a guardar una referencia (`ruta`) en lugar del binario
3. El resto del sistema — rutas, RBAC, frontend — no se toca

Es decir: la decisión es **reversible y de bajo costo**, lo cual es parte del argumento arquitectónico.

---

## 6. Verificación realizada

Ciclo completo probado contra la API y la UI:

- ✅ Subir CV (`POST /api/me/cv`) → responde `cv_nombre` y `cv_actualizado`
- ✅ `GET /api/me` muestra el CV vinculado
- ✅ Descarga (`GET /api/me/cv`) → HTTP 200, `application/pdf`, archivo binario idéntico al subido (verificado con `cmp`)
- ✅ Reemplazo: segunda subida pisa la anterior (upsert)
- ✅ Vista admin (`GET /api/empleados/detalle`) muestra `cv_nombre`
- ✅ Admin descarga CV de un empleado (`GET /api/empleados/:id/cv`)
- ✅ Admin elimina CV (`DELETE /api/empleados/:id/cv`) → el perfil vuelve a "sin CV"
- ✅ UI "Mi Perfil": muestra `📄 <archivo>` con botones **Descargar** y **Reemplazar**
