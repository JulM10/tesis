import { useEffect, useState } from "react";
import { getAllHorarios } from "../services/horarios.services.js";

const HorariosTable = () => {
  const [horarios, setHorarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchHorarios = async () => {
      try {
        const data = await getAllHorarios();
        setHorarios(data);
      } catch (err) {
        console.error(err);
        setError("No se pudieron cargar los horarios");
      } finally {
        setLoading(false);
      }
    };

    fetchHorarios();
  }, []);

  if (loading) return <p>Cargando horarios... ⏳</p>;
  if (error) return <p className="text-red-500">{error}</p>;

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Listado de Horarios</h2>

      <table className="min-w-full border border-black-300">
        <thead className="bg-black-100">
          <tr>
            <th className="border px-3 py-2">Empleado</th>
            <th className="border px-3 py-2">Puesto</th>
            <th className="border px-3 py-2">Fecha</th>
            <th className="border px-3 py-2">Inicio</th>
            <th className="border px-3 py-2">Fin</th>
          </tr>
        </thead>

        <tbody>
          {horarios.map((h, index) => (
            <tr key={index} className="hover:bg-grey-50">
              <td className="border px-3 py-2">
                {h.empleado_nombre} {h.empleado_apellido}
              </td>
              <td className="border px-3 py-2">{h.puesto}</td>
              <td className="border px-3 py-2">
                {new Date(h.fecha).toLocaleDateString()}
              </td>
              <td className="border px-3 py-2">{h.hora_inicio}</td>
              <td className="border px-3 py-2">{h.hora_fin}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default HorariosTable;
