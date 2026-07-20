import { execSync, execFileSync } from "child_process";
import fs from "fs";
import path from "path";

/*
  Backup y restore de la base de datos (costo $0, sin dependencias).

  Uso (desde backend/):
    npm run db:backup                  → crea backups/hotel_yacanto_<fecha>.dump
    npm run db:restore -- <archivo>    → restaura ese dump sobre la BD actual

  - Formato custom de pg_dump (-Fc): comprimido y restaurable por partes.
  - Retención: se conservan los últimos 7 dumps; los más viejos se borran.
  - Corre a través del contenedor (docker exec), así no hace falta tener
    pg_dump instalado en Windows.

  IMPORTANTE (cifrado): los datos personales dentro del dump están
  cifrados con AES-256-GCM. Un backup robado no expone datos... pero
  también significa que sin DATA_ENCRYPTION_KEY el backup es ilegible.
  La clave debe resguardarse POR SEPARADO del dump (nunca juntos).
*/

const CONTENEDOR = "hotel-yacanto-postgres";
const BASE = "hotel_yacanto";
const USUARIO_ADMIN = "postgres"; // pg_dump corre dentro del contenedor
const RETENCION = 7;

// backups/ en la raíz del repo (el script corre desde backend/)
const DIR_BACKUPS = path.resolve(process.cwd(), "..", "backups");

const hacerBackup = () => {
  fs.mkdirSync(DIR_BACKUPS, { recursive: true });

  const marca = new Date().toISOString().replace(/[:T]/g, "-").slice(0, 19);
  const destino = path.join(DIR_BACKUPS, `${BASE}_${marca}.dump`);

  const dump = execSync(
    `docker exec ${CONTENEDOR} pg_dump -U ${USUARIO_ADMIN} -Fc ${BASE}`,
    { maxBuffer: 1024 * 1024 * 512 } // hasta 512MB
  );

  fs.writeFileSync(destino, dump);
  console.log(`Backup creado: ${destino} (${(dump.length / 1024).toFixed(1)} KB)`);

  // Retención: conservar solo los últimos N dumps
  const viejos = fs.readdirSync(DIR_BACKUPS)
    .filter((f) => f.startsWith(BASE) && f.endsWith(".dump"))
    .sort()
    .reverse()
    .slice(RETENCION);

  viejos.forEach((f) => {
    fs.unlinkSync(path.join(DIR_BACKUPS, f));
    console.log(`Retención: eliminado ${f}`);
  });
};

const restaurar = (archivo) => {
  const ruta = path.isAbsolute(archivo) ? archivo : path.resolve(process.cwd(), archivo);

  if (!fs.existsSync(ruta)) {
    console.error(`No existe el archivo: ${ruta}`);
    process.exit(1);
  }

  // --clean --if-exists: borra los objetos y los recrea desde el dump
  execFileSync(
    "docker",
    ["exec", "-i", CONTENEDOR, "pg_restore", "-U", USUARIO_ADMIN,
     "-d", BASE, "--clean", "--if-exists"],
    { input: fs.readFileSync(ruta), stdio: ["pipe", "inherit", "inherit"] }
  );

  console.log(`Restore completado desde: ${ruta}`);
  console.log("Reiniciar el backend para que archive/verifique estado: docker restart hotel-yacanto-backend");
};

const [modo, archivo] = process.argv.slice(2);

if (modo === "restore") {
  if (!archivo) {
    console.error("Uso: npm run db:restore -- <ruta al .dump>");
    process.exit(1);
  }
  restaurar(archivo);
} else {
  hacerBackup();
}
