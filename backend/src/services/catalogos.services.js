import { pool } from "../config/database.js";
import * as Queries from "../queries/catalogos.queries.js";

/**
 * Catálogos de referencia para formularios (selects de alta/edición).
 */
export const getCatalogos = async () => {
  const [puestos, lugares, estados] = await Promise.all([
    pool.query(Queries.GET_PUESTOS),
    pool.query(Queries.GET_LUGARES),
    pool.query(Queries.GET_ESTADOS)
  ]);

  return {
    puestos: puestos.rows,
    lugares: lugares.rows,
    estados: estados.rows
  };
};
