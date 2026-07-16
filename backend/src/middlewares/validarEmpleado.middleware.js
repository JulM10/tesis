export const validarEmpleado = (req, res, next) => {
  const {
    nombre,
    apellido,
    fecha_nacimiento,
    telefono,
    id_usuario
  } = req.body;

  if (!nombre || !apellido) {
    return res.status(400).json({
      message: 'Nombre y apellido son obligatorios'
    });
  }

  if (fecha_nacimiento !== undefined && fecha_nacimiento !== null) {
    const fecha = new Date(fecha_nacimiento);

    if (isNaN(fecha.getTime())) {
      return res.status(400).json({
        message: 'La fecha de nacimiento no es válida'
      });
    }

    if (fecha > new Date()) {
      return res.status(400).json({
        message: 'La fecha de nacimiento no puede ser futura'
      });
    }
  }

  if (telefono && telefono.length > 20) {
    return res.status(400).json({
      message: 'El teléfono supera el máximo permitido'
    });
  }

  if (id_usuario && isNaN(Number(id_usuario))) {
    return res.status(400).json({
      message: 'id_usuario debe ser numérico'
    });
  }

  next();
};
