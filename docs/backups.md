# Backups de la base de datos

**Estrategia:** dumps comprimidos de PostgreSQL (`pg_dump -Fc`) con retención de los últimos 7, ejecutados vía Docker (no requiere PostgreSQL instalado en la máquina). Costo: $0.

## Comandos

```bash
# Crear un backup (desde backend/)
npm run db:backup
#  → backups/hotel_yacanto_<fecha-hora>.dump  (retención: 7)

# Restaurar un backup
npm run db:restore -- ../backups/hotel_yacanto_<fecha-hora>.dump
#  → luego: docker restart hotel-yacanto-backend
```

La carpeta `backups/` está en el `.gitignore`: los dumps contienen datos y nunca van al repositorio.

## Frecuencia recomendada

- **En producción:** diaria (agendar `npm run db:backup` con el Programador de tareas de Windows o cron).
- **Antes de la demo de la defensa:** un backup manual como red de seguridad.

## ⚠️ La clave de cifrado es parte del backup

Los datos personales dentro del dump están cifrados con AES-256-GCM:

- **Ventaja:** un backup robado o extraviado no expone ningún dato personal (bytes ilegibles).
- **Responsabilidad:** sin la `DATA_ENCRYPTION_KEY` del `backend/.env`, el backup es irrecuperable. La clave debe resguardarse **por separado** del dump (nunca en la misma carpeta/medio): perder la clave = perder los datos cifrados de todos los backups.

Regla práctica: al hacer backup de la BD, verificar que exista una copia de la clave en un segundo lugar seguro (gestor de contraseñas, por ejemplo).

## Restore verificado

El ciclo completo fue probado el 17/07/2026: se eliminaron 17 empleados directamente en la BD, se restauró el dump y los 20 empleados volvieron con su historial intacto; la API siguió descifrando los datos correctamente con la misma clave.
