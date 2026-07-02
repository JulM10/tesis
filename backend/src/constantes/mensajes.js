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
    USUARIO_YA_ASOCIADO: "El usuario ya tiene un empleado asociado"
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
    SIN_HORARIOS: "No hay horarios para la fecha indicada"
  },

  AUTH: {
    NO_AUTORIZADO: "No autorizado",
    TOKEN_INVALIDO: "Token inválido o expirado",
    CREDENCIALES_INVALIDAS: "Credenciales inválidas",
    SIN_PERMISO: "No tiene permisos para realizar esta acción"
  }
};
