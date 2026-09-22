import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { getCodigoKiosco } from "@/services/kiosco.services";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/*
  Pantalla del kiosco de asistencia, para la PC de recepción.

  Muestra un QR y un código de 6 dígitos que cambian cada 30 segundos.
  El empleado lo escanea con su celular (o tipea el número en la app) y
  marca con SU sesión: el código prueba que está en el hotel, la sesión
  prueba quién es.

  Es una ruta pública: el equipo se autentica con la clave del kiosco
  (KIOSCO_CLAVE en el backend), que se ingresa una sola vez y queda
  guardada en este navegador. No usa una sesión de usuario porque esas
  se cierran a los 10 minutos sin actividad.
*/

const CLAVE_STORAGE = "hy_kiosco_clave";

const leerClave = () => {
  try {
    return localStorage.getItem(CLAVE_STORAGE) ?? "";
  } catch {
    return "";
  }
};

const guardarClave = (clave) => {
  try {
    if (clave) localStorage.setItem(CLAVE_STORAGE, clave);
    else localStorage.removeItem(CLAVE_STORAGE);
  } catch {
    // Sin almacenamiento (modo privado): la clave dura mientras la pestaña esté abierta.
  }
};

const RELOJ = new Intl.DateTimeFormat("es-AR", {
  timeZone: "America/Argentina/Cordoba",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

const FECHA = new Intl.DateTimeFormat("es-AR", {
  timeZone: "America/Argentina/Cordoba",
  weekday: "long",
  day: "numeric",
  month: "long",
});

function FormularioClave({ error, onGuardar }) {
  const [valor, setValor] = useState("");

  const enviar = (evento) => {
    evento.preventDefault();
    onGuardar(valor.trim());
  };

  return (
    <form
      onSubmit={enviar}
      className="w-full max-w-sm space-y-4 rounded-2xl bg-white p-6 text-gray-900 shadow-xl"
    >
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-gray-900">Configurar este equipo</h2>
        <p className="text-sm text-gray-500">
          Ingresá la clave del kiosco (variable KIOSCO_CLAVE del servidor). Se pide
          una sola vez y queda guardada en este navegador.
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="clave-kiosco">Clave del kiosco</Label>
        <Input
          id="clave-kiosco"
          type="password"
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          autoFocus
          required
        />
      </div>
      {error && (
        <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-800">
          {error}
        </p>
      )}
      <Button type="submit" className="w-full" disabled={!valor.trim()}>
        Activar kiosco
      </Button>
    </form>
  );
}

export default function Kiosco() {
  const [clave, setClave] = useState(leerClave);
  const [codigo, setCodigo] = useState(null); // { codigo, periodo, venceA }
  const [error, setError] = useState("");
  const [ahora, setAhora] = useState(() => Date.now());

  // Reloj de la pantalla y cuenta regresiva del código
  useEffect(() => {
    const intervalo = setInterval(() => setAhora(Date.now()), 1000);
    return () => clearInterval(intervalo);
  }, []);

  // Pide el código y agenda el siguiente pedido para cuando venza
  useEffect(() => {
    if (!clave) return;

    let cancelado = false;
    let siguiente;

    const pedir = async () => {
      try {
        const datos = await getCodigoKiosco(clave);
        if (cancelado) return;

        setCodigo({ ...datos, venceA: Date.now() + datos.venceEn * 1000 });
        setError("");
        // Un instante después del cambio de ventana, para no pedir el mismo código
        siguiente = setTimeout(pedir, datos.venceEn * 1000 + 300);
      } catch (err) {
        if (cancelado) return;

        if (err.response?.status === 401) {
          guardarClave("");
          setClave("");
          setCodigo(null);
          setError("La clave del kiosco es incorrecta.");
          return;
        }

        setError(
          err.response?.data?.error ||
            "Sin conexión con el servidor. Reintentando…"
        );
        siguiente = setTimeout(pedir, 5000);
      }
    };

    pedir();

    return () => {
      cancelado = true;
      clearTimeout(siguiente);
    };
  }, [clave]);

  const activar = (nueva) => {
    guardarClave(nueva);
    setError("");
    setClave(nueva);
  };

  const olvidarClave = () => {
    guardarClave("");
    setClave("");
    setCodigo(null);
  };

  const restante = codigo ? Math.max(0, Math.ceil((codigo.venceA - ahora) / 1000)) : 0;
  const urlMarcar = codigo ? `${window.location.origin}/marcar?c=${codigo.codigo}` : "";

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-emerald-700 via-emerald-800 to-emerald-950 text-white">
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col px-4 py-6 sm:px-8">
        {/* Encabezado */}
        <header className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white text-xl font-bold text-emerald-700">
              HY
            </div>
            <div>
              <p className="text-lg font-semibold leading-tight">Hotel Yacanto</p>
              <p className="text-sm text-emerald-100">Registro de asistencia</p>
            </div>
          </div>
          <div className="text-right">
            <p className="font-mono text-3xl font-semibold tabular-nums sm:text-4xl">
              {RELOJ.format(ahora)}
            </p>
            <p className="text-sm text-emerald-100 first-letter:uppercase">{FECHA.format(ahora)}</p>
          </div>
        </header>

        {/* Contenido */}
        <main className="flex flex-1 items-center justify-center py-8">
          {!clave ? (
            <FormularioClave error={error} onGuardar={activar} />
          ) : !codigo ? (
            <p className="text-lg text-emerald-100">{error || "Obteniendo código…"}</p>
          ) : (
            <div className="grid w-full items-center gap-8 md:grid-cols-2">
              <div className="mx-auto rounded-3xl bg-white p-5 shadow-2xl">
                <QRCodeSVG
                  value={urlMarcar}
                  size={300}
                  level="M"
                  className="h-auto w-full max-w-[300px]"
                  title="Código QR para marcar asistencia"
                />
              </div>

              <div className="space-y-6 text-center md:text-left">
                <div>
                  <p className="text-sm uppercase tracking-widest text-emerald-200">
                    Código
                  </p>
                  <p
                    className="font-mono text-6xl font-bold tabular-nums tracking-[0.15em] sm:text-7xl"
                    aria-live="polite"
                  >
                    {codigo.codigo.slice(0, 3)} {codigo.codigo.slice(3)}
                  </p>
                  <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-emerald-950/60">
                    <div
                      className="h-full rounded-full bg-emerald-300 transition-[width] duration-1000 ease-linear"
                      style={{ width: `${(restante / codigo.periodo) * 100}%` }}
                    />
                  </div>
                  <p className="mt-1 text-sm text-emerald-100">
                    Cambia en {restante} s
                  </p>
                </div>

                <ol className="space-y-2 text-emerald-50">
                  <li>
                    <span className="font-semibold text-white">1.</span> Escaneá el QR
                    con la cámara del celular.
                  </li>
                  <li>
                    <span className="font-semibold text-white">2.</span> Si te lo pide,
                    iniciá sesión con tu usuario.
                  </li>
                  <li>
                    <span className="font-semibold text-white">3.</span> Listo: queda
                    registrado tu ingreso o tu salida.
                  </li>
                </ol>
                <p className="text-sm text-emerald-200">
                  ¿No lee el QR? En Mi perfil, tipeá el código de 6 dígitos.
                </p>
                {error && <p className="text-sm text-amber-200">{error}</p>}
              </div>
            </div>
          )}
        </main>

        {clave && (
          <footer className="text-center">
            <button
              type="button"
              onClick={olvidarClave}
              className="text-xs text-emerald-300 underline-offset-2 hover:underline"
            >
              Desactivar este equipo
            </button>
          </footer>
        )}
      </div>
    </div>
  );
}
