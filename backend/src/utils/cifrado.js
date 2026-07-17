import crypto from "crypto";

/*
  Cifrado de datos personales en la capa de aplicación (AES-256-GCM).

  Modelo de seguridad: la base de datos NUNCA ve un dato personal en
  claro. La clave vive solo en el backend (DATA_ENCRYPTION_KEY) y jamás
  viaja a Postgres — a diferencia de pgcrypto, donde la clave va en cada
  consulta SQL y puede quedar en los logs de la BD.

  GCM es cifrado AUTENTICADO (Ley 25.326, art. 9: evitar "adulteración"
  y "detectar desviaciones"): si alguien modifica los bytes en la BD,
  el authTag no valida y el descifrado falla en lugar de devolver basura.

  Formato de texto:  enc:<iv base64>:<authTag base64>:<cifrado base64>
  Formato binario:   [ iv (12 bytes) | authTag (16 bytes) | cifrado ]
*/

const ALGORITMO = "aes-256-gcm";
const PREFIJO = "enc:";
const IV_BYTES = 12;
const TAG_BYTES = 16;

const obtenerClave = () => {
  const hex = process.env.DATA_ENCRYPTION_KEY;
  const clave = hex ? Buffer.from(hex, "hex") : Buffer.alloc(0);

  if (clave.length !== 32) {
    throw new Error(
      "DATA_ENCRYPTION_KEY inválida: se esperan 32 bytes en hexadecimal (64 caracteres). " +
      "Generar con: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
    );
  }

  return clave;
};

/** Cifra un texto. null/undefined pasan de largo (columnas opcionales). */
export const cifrar = (textoPlano) => {
  if (textoPlano === null || textoPlano === undefined) return textoPlano;

  const iv = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv(ALGORITMO, obtenerClave(), iv);
  const cifrado = Buffer.concat([
    cipher.update(String(textoPlano), "utf8"),
    cipher.final()
  ]);

  return (
    PREFIJO +
    iv.toString("base64") + ":" +
    cipher.getAuthTag().toString("base64") + ":" +
    cifrado.toString("base64")
  );
};

/** Descifra un texto. Lanza error si el dato fue adulterado (authTag inválido). */
export const descifrar = (payload) => {
  if (payload === null || payload === undefined) return payload;

  if (typeof payload !== "string" || !payload.startsWith(PREFIJO)) {
    // Dato que nunca fue cifrado (no debería ocurrir con el seed correcto)
    return payload;
  }

  const [iv, tag, cifrado] = payload.slice(PREFIJO.length).split(":");

  try {
    const decipher = crypto.createDecipheriv(
      ALGORITMO,
      obtenerClave(),
      Buffer.from(iv, "base64")
    );
    decipher.setAuthTag(Buffer.from(tag, "base64"));

    return Buffer.concat([
      decipher.update(Buffer.from(cifrado, "base64")),
      decipher.final()
    ]).toString("utf8");
  } catch {
    throw new Error("Dato cifrado inválido o adulterado (falló la verificación de integridad)");
  }
};

/** Cifra un binario (ej: CV). Devuelve Buffer para columna BYTEA. */
export const cifrarBuffer = (buffer) => {
  if (!buffer) return buffer;

  const iv = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv(ALGORITMO, obtenerClave(), iv);
  const cifrado = Buffer.concat([cipher.update(buffer), cipher.final()]);

  return Buffer.concat([iv, cipher.getAuthTag(), cifrado]);
};

/** Descifra un binario. Lanza error si fue adulterado. */
export const descifrarBuffer = (buffer) => {
  if (!buffer) return buffer;

  try {
    const iv = buffer.subarray(0, IV_BYTES);
    const tag = buffer.subarray(IV_BYTES, IV_BYTES + TAG_BYTES);
    const cifrado = buffer.subarray(IV_BYTES + TAG_BYTES);

    const decipher = crypto.createDecipheriv(ALGORITMO, obtenerClave(), iv);
    decipher.setAuthTag(tag);

    return Buffer.concat([decipher.update(cifrado), decipher.final()]);
  } catch {
    throw new Error("Archivo cifrado inválido o adulterado (falló la verificación de integridad)");
  }
};
