import { Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { useAuth } from "@/context/AuthContext";
import ControlDeSesion from "@/components/ControlDeSesion";

export default function ProtectedRoute({ children }) {
  const { usuario } = useAuth();

  if (!usuario) {
    return <Navigate to="/login" replace />;
  }

  return (
    <>
      <Toaster richColors position="top-right" />
      {/* Cierre por inactividad y renovación del token: solo dentro del
          área autenticada, y una sola instancia (renderiza la ruta activa) */}
      <ControlDeSesion />
      {children}
    </>
  );
}
