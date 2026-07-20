import api from '../apis/axios';
import { descargarBlob } from './empleados.services';

/**
 * Historial de turnos con filtros opcionales:
 * { desde, hasta, empleado, puesto }
 */
export const getReporteHistorial = async (filtros = {}) => {
  const response = await api.get('/reportes/historial', { params: filtros });
  return response.data;
};

/**
 * Horas trabajadas por empleado/puesto en un rango de fechas
 * (backend: fn_horas_trabajadas; default últimos 30 días)
 */
export const getReporteHoras = async (filtros = {}) => {
  const response = await api.get('/reportes/horas', { params: filtros });
  return response.data;
};

/** Cantidad de empleados por puesto y lugar de trabajo */
export const getReporteDotacion = async () => {
  const response = await api.get('/reportes/dotacion');
  return response.data;
};

/**
 * Genera y descarga un CSV desde filas JSON.
 * columnas: [{ clave, titulo }] — el BOM inicial hace que Excel
 * abra el archivo con acentos correctos (UTF-8).
 */
export const descargarCSV = (filas, columnas, nombreArchivo) => {
  const escapar = (valor) => {
    const texto = valor === null || valor === undefined ? '' : String(valor);
    return /[";\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
  };

  const encabezado = columnas.map((c) => escapar(c.titulo)).join(';');
  const cuerpo = filas.map((fila) =>
    columnas.map((c) => escapar(fila[c.clave])).join(';')
  );

  // BOM UTF-8 (U+FEFF): hace que Excel abra los acentos bien
  const BOM = String.fromCharCode(0xfeff);
  const csv = BOM + [encabezado, ...cuerpo].join("\n");
  descargarBlob(new Blob([csv], { type: 'text/csv;charset=utf-8' }), nombreArchivo);
};
