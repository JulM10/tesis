import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, LogIn, LogOut } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { marcarAsistencia } from "@/services/me.services";
import CodigoAsistencia from "@/components/CodigoAsistencia";
import { horaCorta } from "@/lib/fechas";
import { Button } from "@/components/ui/button";

/*
  Destino del QR del kiosco: /marcar?c=123456

  Es una ruta protegida: si la sesión no estaba abierta, el login trae de
  vuelta acá con el código intacto. La marca se envía sola al entrar; si
  el código venció mientras tanto, queda el campo para tipear el que
  muestra la pantalla en ese momento.

  Pensada para el celular: no usa el Layout con la barra de navegación.
*/

function Resultado({ marca }) {
  const esIngreso = marca.tipo === "INGRESO";
  const Icono = esIngreso ? LogIn : LogOut;

  return (
    <div className="space-y-4 text-center">
      <CheckCircle2 className="mx-auto h-16 w-16 text-emerald-600" aria-hidden="true" />
      <div>
        <p className="text-xl font-semibold text-gray-900">
          {esIngreso ? "Ingreso registrado" : "Salida registrada"}
        </p>
        <p className="mt-1 font-mono text-4xl font-bold tabular-nums text-emerald-700">
          {marca.hora}
        </p>
      </div>
      <p className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-sm text-emerald-800">
        <Icono className="h-4 w-4" aria-hidden="true" />
        Turno de {horaCorta(marca.turno.hora_inicio)} a {horaCorta(marca.turno.hora_fin)}
        {marca.turno.puesto && <> · {marca.turno.puesto}</>}
      </p>
    </div>
  );
}

export default function Marcar() {
  const { usuario, logout } = useAuth();
  const [params, setParams] = useSearchParams();

  const [codigoQR] = useState(() => params.get("c") ?? "");
  const [enviando, setEnviando] = useState(/^\d{6}$/.test(codigoQR));
  const [marca, setMarca] = useState(null);
  const [error, setError] = useState("");

  // El envío automático corre una sola vez aunque el efecto se repita.
  const enviado = useRef(false);

  useEffect(() => {
    if (enviado.current || !/^\d{6}$/.test(codigoQR)) return;
    enviado.current = true;

    (async () => {
      try {
        const respuesta = await marcarAsistencia(codigoQR);
        setMarca(respuesta.data);
      } catch (err) {
        // Sesión vencida: el interceptor de axios ya está llevando al login
        // con esta URL (código incluido) para volver acá después.
        if (err.response?.status === 401) return;
        setError(err.response?.data?.error || "No se pudo registrar la marca");
      } finally {
        setEnviando(false);
      }

      // Se saca el código de la URL: recargar la página no debe volver a marcar.
      setParams({}, { replace: true });
    })();
  }, [codigoQR, setParams]);

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-emerald-100 p-4">
      <div className="w-full max-w-sm space-y-6 rounded-2xl border border-emerald-100 bg-white p-6 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-600 font-bold text-white">
            HY
          </div>
          <div>
            <p className="font-semibold leading-tight text-gray-900">Registro de asistencia</p>
            <p className="text-xs text-gray-500">{usuario?.email}</p>
          </div>
        </div>

        {enviando ? (
          <p className="py-8 text-center text-gray-500" aria-live="polite">
            Registrando tu marca…
          </p>
        ) : marca ? (
          <Resultado marca={marca} />
        ) : (
          <CodigoAsistencia onMarcado={setMarca} errorInicial={error} />
        )}

        <div className="flex items-center justify-between gap-2 border-t border-gray-100 pt-4 text-sm">
          <Button asChild variant="outline" size="sm">
            <Link to="/mi-perfil">Ir a Mi perfil</Link>
          </Button>
          <button
            type="button"
            onClick={logout}
            className="text-gray-500 underline-offset-2 hover:underline"
          >
            ¿No sos vos? Cerrar sesión
          </button>
        </div>
      </div>
    </div>
  );
}
