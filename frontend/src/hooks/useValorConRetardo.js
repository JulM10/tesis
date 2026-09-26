import { useEffect, useState } from "react";

/**
 * Devuelve el valor recién después de que deje de cambiar por `retardo` ms.
 * Se usa para no disparar una consulta por cada tecla en un buscador.
 */
export function useValorConRetardo(valor, retardo = 300) {
  const [diferido, setDiferido] = useState(valor);

  useEffect(() => {
    /*
      La actualización ocurre dentro del temporizador, no en el cuerpo del
      efecto: así no choca con react-hooks/set-state-in-effect.
    */
    const temporizador = setTimeout(() => setDiferido(valor), retardo);
    return () => clearTimeout(temporizador);
  }, [valor, retardo]);

  return diferido;
}
