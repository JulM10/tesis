import { useState } from "react";
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

import { login } from "@/services/auth.services";

export default function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // ⚠️ Mock temporal hasta tener backend
      const user = await login({ email, password });
      onLogin(user);
    } catch (error) {
      alert("Credenciales inválidas (o backend durmiendo 😴)");
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

            <p className="login-demo-text">
              Demo activa – backend sin autenticación
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
