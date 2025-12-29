export const validarEmpleado = (req, res, next) => {
  const {
    nombre,
    apellido,
    edad,
    telefono,
    id_usuario
  } = req.body;

  if (!nombre || !apellido) {
    return res.status(400).json({
      message: 'Nombre y apellido son obligatorios'
    });
  }

  if (edad !== undefined && edad !== null && edad < 0) {
    return res.status(400).json({
      message: 'La edad no puede ser negativa'
    });
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
