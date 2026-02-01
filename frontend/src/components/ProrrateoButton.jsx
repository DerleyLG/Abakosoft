import React, { useState } from "react";
import ProrrateoOrdenDrawer from "./ProrrateoDrawer";
import progresoFabricacionService from "../services/progresoFabricacionService";

const ProrrateoButton = ({ orden }) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [prorrateoPorArticulo, setProrrateoPorArticulo] = useState([]);
  const [avancesReales, setAvancesReales] = useState([]);
  const [resumen, setResumen] = useState({});

  const handleOpen = async () => {
    setLoading(true);
    try {
      // Obtener progreso de la orden (incluye prorrateo y avances)
      const res = await progresoFabricacionService.getProgresoOrden(
        orden.id_orden_fabricacion,
      );
      // El backend retorna { success, orden, resumen, articulos }
      setProrrateoPorArticulo(res.articulos || []);
      setAvancesReales(res.avances || []); // Si el backend retorna avances
      setResumen(res.resumen || {});
      setOpen(true);
    } catch (e) {
      // Si hay error, abrir igual pero vacío
      setProrrateoPorArticulo([]);
      setAvancesReales([]);
      setResumen({});
      setOpen(true);
    } finally {
      setLoading(false);
    }
  };
  const handleClose = () => setOpen(false);

  return (
    <>
      <button
        className="px-4 py-2 bg-blue-700 text-white rounded hover:bg-blue-800 font-semibold shadow-md transition"
        onClick={handleOpen}
        title="Ejecutar prorrateo de la orden"
        disabled={loading}
      >
        {loading ? "Cargando..." : "Ejecutar prorrateo"}
      </button>
      <ProrrateoOrdenDrawer
        open={open}
        onClose={handleClose}
        orden={orden}
        prorrateoPorArticulo={prorrateoPorArticulo}
        avancesReales={avancesReales}
        resumen={resumen}
      />
    </>
  );
};

export default ProrrateoButton;
