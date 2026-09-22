import { useState } from "react";
import { marcarAsistencia } from "@/services/me.services";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * Carga manual del código de 6 dígitos que muestra el kiosco: la
 * alternativa al QR cuando la cámara no lo lee o el código venció
 * mientras se iniciaba sesión.
 *
 * El servidor decide si la marca es ingreso o salida; este componente
 * solo envía el código y avisa el resultado con onMarcado(data).
 */
export default function CodigoAsistencia({ onMarcado, errorInicial = "" }) {
  const [codigo, setCodigo] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(errorInicial);

  const enviar = async (evento) => {
    evento.preventDefault();
    setEnviando(true);
    setError("");

    try {
      const respuesta = await marcarAsistencia(codigo);
      setCodigo("");
      onMarcado(respuesta.data);
    } catch (err) {
      setError(err.response?.data?.error || "No se pudo registrar la marca");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <form onSubmit={enviar} className="space-y-2">
      <Label htmlFor="codigo-asistencia">Código de la pantalla de recepción</Label>
      <div className="flex gap-2">
        <Input
          id="codigo-asistencia"
          value={codigo}
          onChange={(e) => setCodigo(e.target.value.replace(/\D/g, "").slice(0, 6))}
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder="000000"
          className="font-mono text-lg tracking-[0.3em]"
          aria-describedby={error ? "codigo-asistencia-error" : undefined}
        />
        <Button type="submit" disabled={enviando || codigo.length !== 6}>
          {enviando ? "Marcando..." : "Marcar"}
        </Button>
      </div>
      {error && (
        <p
          id="codigo-asistencia-error"
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-800"
        >
          {error}
        </p>
      )}
    </form>
  );
}
