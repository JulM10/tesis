export const MENSAJES = {
  GENERAL: {
    ERROR_INTERNO: "Error interno del servidor",
    OPERACION_EXITOSA: "Operación realizada correctamente"
  },

  VALIDACION: {
    CAMPOS_OBLIGATORIOS: "Faltan datos obligatorios",
    ID_INVALIDO: "El ID proporcionado no es válido",
    REFERENCIA_INVALIDA: "Referencia inválida: alguno de los IDs relacionados no existe"
  },

  EMPLEADOS: {
    NO_ENCONTRADO: "Empleado no encontrado",
    CREADO_OK: "Empleado creado correctamente",
    ACTUALIZADO_OK: "Empleado actualizado correctamente",
    ELIMINADO_OK: "Empleado eliminado correctamente",
    USUARIO_YA_ASOCIADO: "El usuario ya tiene un empleado asociado",
    DIAS_VACACIONES_INVALIDOS: "Los días de vacaciones por año deben ser un número entero entre 0 y 60"
  },

  LICENCIAS: {
    TIPO_INVALIDO: "El tipo de licencia debe ser VACACIONES, ENFERMEDAD o ESPECIAL",
    FECHAS_INVALIDAS: "Las fechas son obligatorias y deben tener formato AAAA-MM-DD",
    RANGO_INVALIDO: "La fecha de fin no puede ser anterior a la de inicio",
    COMENTARIO_MUY_LARGO: "El comentario no puede superar los 500 caracteres",
    SUPERPUESTA: "Ya hay una licencia cargada que se superpone con esas fechas",
    NO_ENCONTRADA: "La licencia no existe",
    CREADA_OK: "Licencia registrada correctamente",
    ELIMINADA_OK: "Licencia eliminada correctamente",
    SALDO_INSUFICIENTE: (disponibles, anio, dias) =>
      `Le quedan ${disponibles} días de vacaciones en ${anio} y el período pide ${dias}`,
    TURNOS_ASIGNADOS: (cantidad, fechas) =>
      `El empleado tiene ${cantidad} turno${cantidad === 1 ? "" : "s"} asignado${cantidad === 1 ? "" : "s"} ` +
      `en esas fechas (${fechas}). Reasignalos antes de cargar las vacaciones.`
  },

  CALENDARIO: {
    NO_ENCONTRADO: "Calendario no encontrado",
    CREADO_OK: "Turno creado correctamente",
    ACTUALIZADO_OK: "Turno actualizado correctamente",
    ELIMINADO_OK: "Turno eliminado correctamente",
    HORARIO_INVALIDO: "La hora de fin debe ser posterior a la hora de inicio"
  },

  HORARIOS: {
    YA_ASIGNADO: "El empleado ya está asignado a este turno",
    CONFLICTO_HORARIO: "El empleado ya tiene un horario asignado que se superpone",
    ASIGNADO_OK: "Horario asignado correctamente",
    ELIMINADO_OK: "Asignación de horario eliminada correctamente",
    NO_EXISTE_ASIGNACION: "La asignación de horario no existe",
    SIN_HORARIOS: "No hay horarios para la fecha indicada",
    EN_LICENCIA: "El empleado tiene una licencia cargada para ese día"
  },

  USUARIOS: {
    NO_ENCONTRADO: "Usuario no encontrado",
    CREADO_OK: "Usuario creado correctamente",
    ACTUALIZADO_OK: "Usuario actualizado correctamente",
    ELIMINADO_OK: "Usuario eliminado correctamente",
    EMAIL_YA_EXISTE: "Ya existe un usuario con ese email",
    EMAIL_INVALIDO: "El email no tiene un formato válido",
    EMPLEADO_YA_VINCULADO: "El empleado ya tiene un usuario asociado o no existe",
    NO_AUTOELIMINAR: "No podés eliminar tu propio usuario",
    NO_AUTODESACTIVAR: "No podés desactivar tu propio usuario",
    NO_AUTORESET: "Para cambiar tu propia contraseña usá el cambio de contraseña",
    PASSWORD_RESETEADA: "Contraseña reseteada correctamente"
  },

  ME: {
    SIN_EMPLEADO: "Tu usuario no tiene un empleado vinculado"
  },

  ESTABLECIMIENTO: {
    TIPO_INVALIDO: "Solo se pueden administrar puestos y lugares de trabajo",
    NOMBRE_REQUERIDO: "El nombre no puede estar vacío",
    NOMBRE_MUY_LARGO: "El nombre supera el largo máximo permitido",
    NOMBRE_DUPLICADO: "Ya existe un registro con ese nombre",
    NO_ENCONTRADO: "El registro no existe",
    CREADO_OK: "Creado correctamente",
    ACTUALIZADO_OK: "Actualizado correctamente",
    ELIMINADO_OK: "Eliminado correctamente"
  },

  CV: {
    SUBIDO_OK: "CV subido correctamente",
    ELIMINADO_OK: "CV eliminado correctamente",
    NO_ENCONTRADO: "El empleado no tiene CV cargado",
    TIPO_INVALIDO: "Solo se permiten archivos PDF o DOCX",
    MUY_GRANDE: "El archivo supera el máximo de 5MB",
    ARCHIVO_REQUERIDO: "Falta el archivo (campo 'cv')"
  },

  AUTH: {
    NO_AUTORIZADO: "No autorizado",
    TOKEN_INVALIDO: "Token inválido o expirado",
    CREDENCIALES_INVALIDAS: "Credenciales inválidas",
    SIN_PERMISO: "No tiene permisos para realizar esta acción",
    PASSWORD_MUY_CORTA: "La nueva contraseña debe tener al menos 8 caracteres",
    PASSWORD_REPETIDA: "La nueva contraseña debe ser distinta de la actual",
    PASSWORD_ACTUALIZADA: "Contraseña actualizada correctamente"
  }
};
