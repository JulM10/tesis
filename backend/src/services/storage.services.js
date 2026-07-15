import { createClient } from "@supabase/supabase-js";
import { MENSAJES } from "../constantes/mensajes.js";
import { httpError } from "../utils/httpError.js";

/*
  Adaptador de almacenamiento de archivos (Supabase Storage).
  Todo el resto del backend usa solo estas tres funciones, así que
  cambiar de proveedor (Cloudinary, S3, etc.) implica tocar únicamente
  este archivo.

  El bucket es PRIVADO: los archivos jamás se sirven por URL pública;
  siempre pasan por el backend, que valida sesión y permisos (RBAC).
*/

const BUCKET = process.env.SUPABASE_BUCKET || "cvs";

let cliente = null;

const getCliente = () => {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    throw httpError(503, MENSAJES.CV.NO_CONFIGURADO);
  }

  if (!cliente) {
    cliente = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );
  }

  return cliente;
};

export const subirArchivo = async (ruta, buffer, mime) => {
  const { error } = await getCliente()
    .storage.from(BUCKET)
    .upload(ruta, buffer, { contentType: mime, upsert: true });

  if (error) {
    console.error("[storage] Error al subir:", error.message);
    throw httpError(502, MENSAJES.CV.ERROR_STORAGE);
  }
};

export const descargarArchivo = async (ruta) => {
  const { data, error } = await getCliente()
    .storage.from(BUCKET)
    .download(ruta);

  if (error) {
    console.error("[storage] Error al descargar:", error.message);
    throw httpError(502, MENSAJES.CV.ERROR_STORAGE);
  }

  return Buffer.from(await data.arrayBuffer());
};

export const eliminarArchivo = async (ruta) => {
  const { error } = await getCliente()
    .storage.from(BUCKET)
    .remove([ruta]);

  if (error) {
    // Borrado best-effort: se loguea pero no rompe la operación principal
    console.error("[storage] Error al eliminar:", error.message);
  }
};
