/*
  Validación del ALTA de empleado (solo POST /api/empleados).

  Desde que el alta provisiona automáticamente la cuenta de acceso,
  email y DNI dejaron de ser opcionales: el email es la identidad de
  login y el DNI aporta los 4 dígitos de la password inicial.
  El PUT no pasa por acá, así que la edición sigue siendo parcial.
*/

// Formato de email deliberadamente laxo: algo@algo.algo, sin espacios.
// La garantía fuerte de unicidad la da el UNIQUE de usuarios.email.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const validarEmpleado = (req, res, next) => {
  const {
    nombre,
    apellido,
    dni,
    email,
    fecha_nacimiento,
    telefono
  } = req.body;

  if (!nombre || !apellido) {
    return res.status(400).json({
      message: 'Nombre y apellido son obligatorios'
    });
  }

  if (!email || !EMAIL_RE.test(String(email).trim())) {
    return res.status(400).json({
      message: 'El email es obligatorio y debe tener un formato válido'
    });
  }

  // Se valida sobre los dígitos: se aceptan "20.123.456" y "20123456".
  const dniDigitos = String(dni ?? '').replace(/\D/g, '');

  if (dniDigitos.length < 7 || dniDigitos.length > 8) {
    return res.status(400).json({
      message: 'El DNI es obligatorio y debe tener 7 u 8 dígitos'
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

  next();
};
