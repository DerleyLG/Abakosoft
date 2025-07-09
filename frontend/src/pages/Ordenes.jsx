import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const OrdenesDashboard = () => {
  const [resumen, setResumen] = useState({
    compra: { total: 0, pendientes: 0 },
    fabricacion: { total: 0, pendientes: 0 },
    venta: { total: 0, pendientes: 0 },
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const navigate = useNavigate();

  useEffect(() => {
    const fetchResumen = async () => {
      try {
        setLoading(true);
        const response = await fetch('http://localhost:3300/api/ordenes/resumen');
        
        if (!response.ok) throw new Error('Error al obtener datos');

        const data = await response.json();

        // Convierte los valores a números por si vienen como string
        setResumen({
          compra: {
            total: Number(data.compra.total),
            pendientes: Number(data.compra.pendientes),
          },
          fabricacion: {
            total: Number(data.fabricacion.total),
            pendientes: Number(data.fabricacion.pendientes),
          },
          venta: {
            total: Number(data.venta.total),
            pendientes: Number(data.venta.pendientes),
          },
        });
        setError(null);
      } catch (err) {
        console.error(err);
        setError('No se pudo cargar el resumen de órdenes');
      } finally {
        setLoading(false);
      }
    };

    fetchResumen();
  }, []);

  if (loading) {
    return (
      <div className="w-full px-4 md:px-12 lg:px-20 py-10 text-center text-gray-600">
        Cargando resumen de órdenes...
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full px-4 md:px-12 lg:px-20 py-10 text-center text-red-600 font-semibold">
        {error}
      </div>
    );
  }
  return (
    <div className="w-full px-4 md:px-12 lg:px-20 py-10 select-none">
      <h1 className="text-4xl font-bold text-gray-800 mb-10 ">Gestión de ordenes</h1>

      <div className="grid gap-8 md:grid-cols-3">

        {/* Órdenes de Compra */}
        <section className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 flex flex-col justify-between">
          <div>
            <h2 className="text-2xl font-semibold mb-3 text-gray-800">Órdenes de Compra</h2>
            <p className="mb-1 text-gray-700">Total: <span className="font-bold">{resumen.compra.total}</span></p>
            <p className="mb-1 text-gray-700">Pendientes: <span className="font-bold">{resumen.compra.pendientes}</span></p>
          </div>
          <button
            onClick={() => navigate('/ordenes_compra')}
            className="mt-auto bg-slate-800 hover:bg-slate-600 text-white py-3 rounded-md font-semibold transition cursor-pointer"
          >
            Ver órdenes de compra
          </button>
        </section>

        {/* Órdenes de Fabricación */}
        <section className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 flex flex-col justify-between">
          <div>
            <h2 className="text-2xl font-semibold mb-3 text-gray-800">Órdenes de Fabricación</h2>
            <p className="mb-1 text-gray-700">Total: <span className="font-bold">{resumen.fabricacion.total}</span></p>
            <p className="mb-1 text-gray-700">Pendientes:<span className="font-bold"> {resumen.fabricacion.pendientes}</span></p>
          </div>
          <button
            onClick={() => navigate('/ordenes_fabricacion')}
            className="mt-auto bg-slate-800 hover:bg-slate-600 text-white py-3 rounded-md font-semibold transition cursor-pointer"
          >
            Ver órdenes de fabricación
          </button>
        </section>

        {/* Órdenes de Venta */}
        <section className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 flex flex-col justify-between">
          <div>
            <h2 className="text-2xl font-semibold mb-3 text-gray-800">Órdenes de Venta</h2>
            <p className="mb-1 text-gray-700">Total: <span className="font-bold">{resumen.venta.total}</span></p>
            <p className="mb-1 text-gray-700">Pendientes: <span className="font-bold">{resumen.venta.pendientes}</span></p>
          </div>
          <button
            onClick={() => navigate('/ordenes_venta')}
            className="mt-auto bg-slate-800 hover:bg-slate-600 text-white py-3 rounded-md font-semibold transition cursor-pointer"
          >
            Ver órdenes de venta
          </button>
        </section>

      </div>
    </div>
  );
};

export default OrdenesDashboard;
