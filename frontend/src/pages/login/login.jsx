import { useState } from "react";
import { Navigate, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import "./login.css";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { useAuth } from "@/context/AuthContext";

/*
  A dónde ir después del login: la ruta que se quiso abrir sin sesión
  (ProtectedRoute la pasa en el state; el interceptor de axios, como
  ?volver= porque recarga la página). Solo rutas internas: un "volver"
  armado a mano no puede mandar al usuario a otro sitio.
*/
const destinoSeguro = (ruta) =>
  typeof ruta === "string" &&
  ruta.startsWith("/") &&
  !ruta.startsWith("//") &&
  !ruta.startsWith("/\\") &&
  !ruta.startsWith("/login")
    ? ruta
    : "/";

export default function Login() {
  const { usuario, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const destino = destinoSeguro(location.state?.desde ?? params.get("volver"));

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Si ya hay sesión activa, no mostrar el login
  if (usuario) {
    return <Navigate to={destino} replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await login(email, password);
      navigate(destino, { replace: true });
    } catch (err) {
      setError(
        err.response?.data?.error || "No se pudo conectar con el servidor"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <Card className="login-card">
        <CardHeader className="text-center space-y-3 pb-8">
          <div className="login-logo">HY</div>
          <CardTitle className="text-emerald-700 text-2xl">
            Hotel Yacanto
          </CardTitle>
          <CardDescription>
            Sistema de Gestión de Recursos Humanos
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Correo electrónico</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="usuario@hotelyacanto.com"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full login-button"
              disabled={loading}
            >
              {loading ? "Ingresando..." : "Ingresar"}
            </Button>

            {error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded text-red-800 text-sm">
                {error}
              </div>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
