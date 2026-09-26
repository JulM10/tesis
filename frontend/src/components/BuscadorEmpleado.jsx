import { useEffect, useId, useRef, useState } from "react";
import { X } from "lucide-react";
import { buscarEmpleados } from "@/services/empleados.services";
import { useValorConRetardo } from "@/hooks/useValorConRetardo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/*
  Buscador de empleados con autocompletado.

  Reemplaza al desplegable que listaba el padrón entero: la consulta sale
  recién a partir de tres letras y el backend devuelve unos pocos
  resultados, así que la pantalla no depende de cuántos empleados haya.

  La lista se dibuja DENTRO del flujo, debajo del campo, y no como capa
  flotante. Dentro de un diálogo, una capa flotante se da vuelta hacia
  arriba cuando no le entra abajo (era el problema del desplegable) y
  además la recorta el scroll del propio diálogo. Así el diálogo
  simplemente crece.
*/

const MINIMO = 3;

export default function BuscadorEmpleado({
  id,
  valor,
  onSeleccionar,
  limite = 8,
  autoFocus = false,
}) {
  const idLista = `${useId()}-lista`;
  const campo = useRef(null);

  const [texto, setTexto] = useState("");
  const [resultados, setResultados] = useState([]);
  const [activo, setActivo] = useState(0);
  const [buscando, setBuscando] = useState(false);
  const [error, setError] = useState("");

  const consulta = useValorConRetardo(texto.trim(), 300);

  /*
    Lo que se ve se deriva de la consulta vigente: al borrar letras los
    resultados anteriores dejan de mostrarse sin tener que limpiar estado
    desde el efecto (regla react-hooks/set-state-in-effect).
  */
  const hayConsulta = consulta.length >= MINIMO;
  const visibles = hayConsulta ? resultados : [];
  const estaBuscando = hayConsulta && buscando;
  const mensajeError = hayConsulta ? error : "";
  const sinResultados = hayConsulta && !buscando && !error && resultados.length === 0;

  useEffect(() => {
    if (consulta.length < MINIMO) return;

    const controlador = new AbortController();

    (async () => {
      setBuscando(true);
      try {
        const encontrados = await buscarEmpleados(consulta, {
          limite,
          signal: controlador.signal,
        });
        setResultados(encontrados);
        setActivo(0);
        setError("");
      } catch (err) {
        // Consulta abortada porque el usuario siguió escribiendo: no es un error.
        if (err.code === "ERR_CANCELED") return;
        setResultados([]);
        setError(err.response?.data?.error || "No se pudo buscar");
      } finally {
        setBuscando(false);
      }
    })();

    return () => controlador.abort();
  }, [consulta, limite]);

  const elegir = (empleado) => {
    onSeleccionar(empleado);
    setTexto("");
    setResultados([]);
  };

  const limpiar = () => {
    onSeleccionar(null);
    setTexto("");
    // El foco vuelve al campo para poder escribir otro nombre enseguida.
    requestAnimationFrame(() => campo.current?.focus());
  };

  const alPresionarTecla = (evento) => {
    if (evento.key === "ArrowDown") {
      evento.preventDefault();
      setActivo((indice) => Math.min(indice + 1, visibles.length - 1));
    } else if (evento.key === "ArrowUp") {
      evento.preventDefault();
      setActivo((indice) => Math.max(indice - 1, 0));
    } else if (evento.key === "Enter") {
      // Siempre: el buscador puede estar dentro de un formulario.
      evento.preventDefault();
      if (visibles[activo]) elegir(visibles[activo]);
    } else if (evento.key === "Escape" && visibles.length > 0) {
      // Sin esto, Escape cierra el diálogo entero en vez de la lista.
      evento.stopPropagation();
      setResultados([]);
    }
  };

  if (valor) {
    return (
      <div className="flex items-center gap-2 rounded-md border bg-gray-50 px-3 py-2 text-sm">
        <span className="min-w-0 flex-1 truncate">
          {valor.nombre} {valor.apellido}
          {valor.puesto && <span className="text-gray-500"> — {valor.puesto}</span>}
        </span>
        <Button type="button" variant="ghost" size="sm" onClick={limpiar}>
          <X className="h-4 w-4" />
          Cambiar
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <Input
        id={id}
        ref={campo}
        value={texto}
        onChange={(evento) => setTexto(evento.target.value)}
        onKeyDown={alPresionarTecla}
        autoFocus={autoFocus}
        autoComplete="off"
        placeholder="Nombre o apellido"
        role="combobox"
        aria-expanded={visibles.length > 0}
        aria-controls={idLista}
        aria-autocomplete="list"
        aria-activedescendant={
          visibles[activo] ? `${idLista}-${visibles[activo].id}` : undefined
        }
      />

      {visibles.length > 0 && (
        <ul
          id={idLista}
          role="listbox"
          className="max-h-56 divide-y divide-gray-100 overflow-y-auto rounded-md border"
        >
          {visibles.map((empleado, indice) => (
            <li
              key={empleado.id}
              id={`${idLista}-${empleado.id}`}
              role="option"
              aria-selected={indice === activo}
              className={`flex min-h-11 cursor-pointer items-center px-3 py-2.5 text-sm ${
                indice === activo ? "bg-emerald-50" : "hover:bg-gray-50"
              }`}
              // onMouseDown y no onClick: tiene que ganarle al blur del campo.
              onMouseDown={(evento) => {
                evento.preventDefault();
                elegir(empleado);
              }}
              onMouseEnter={() => setActivo(indice)}
            >
              <span className="min-w-0 flex-1 truncate">
                {empleado.nombre} {empleado.apellido}
                {empleado.puesto && (
                  <span className="text-gray-500"> — {empleado.puesto}</span>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}

      <p role="status" aria-live="polite" className="text-xs text-gray-500">
        {mensajeError
          ? mensajeError
          : estaBuscando
            ? "Buscando…"
            : sinResultados
              ? `Sin resultados para «${consulta}»`
              : !hayConsulta
                ? "Escribí al menos 3 letras"
                : ""}
      </p>
    </div>
  );
}
