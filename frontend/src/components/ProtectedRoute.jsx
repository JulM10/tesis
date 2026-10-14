import { Navigate, useLocation } from "react-router-dom";
import { Toaster } from "sonner";
import { useAuth } from "@/context/AuthContext";
import ControlDeSesion from "@/components/ControlDeSesion";
import CambioPassword from "@/components/CambioPassword";

export default function ProtectedRoute({ children }) {
  const { usuario } = useAuth();
  const location = useLocation();

  if (!usuario) {
    // El login vuelve a la ruta pedida: así el QR del kiosco (/marcar?c=…)
    // funciona aunque la sesión no estuviera abierta.
    return (
      <Navigate
        to="/login"
        replace
        state={{ desde: location.pathname + location.search }}
      />
    );
  }

  return (
    <>
      <Toaster richColors position="top-right" />
      {/* Cierre por inactividad y renovación del token: solo dentro del
          área autenticada, y una sola instancia (renderiza la ruta activa) */}
      <ControlDeSesion />
      {/* Contraseña inicial o reseteada: se cambia antes de poder operar.
          Va acá y no en Layout porque /marcar no usa Layout. */}
      <CambioPassword obligatorio />
      {children}
    </>
  );
}
