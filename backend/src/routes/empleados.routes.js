import { Router } from 'express';

const router = Router();

/**
 * GET /api/empleados
 * Obtiene el listado de empleados
 */
router.get('/', (req, res) => {
  res.json({ status: 'ok' });
});

/**
 * GET /api/empleados/:id
 * Obtiene un empleado por ID
 */
router.get('/:id', (req, res) => {
  const { id } = req.params;
  res.json({ id, nombre: 'Empleado Ejemplo' });
});

/**
 * POST /api/empleados
 * Crea un nuevo empleado
*/
router.post('/', (req, res) => {
  const nuevoEmpleado = req.body;
    res.status(201).json({ message: 'Empleado creado', empleado: nuevoEmpleado });
});

/**
 * PUT /api/empleados/:id
 * Actualiza un empleado por ID
 */
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const datosActualizados = req.body;
  res.json({ message: 'Empleado actualizado', id, datos: datosActualizados });
});

/**
 * DELETE /api/empleados/:id
 * Elimina un empleado por ID
 */
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  res.json({ message: 'Empleado eliminado', id });
});


export default router;