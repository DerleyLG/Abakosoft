// src/pages/ListaLotesFabricacion.jsx
import React, { useEffect, useState } from "react";
import api from "../services/api";
import {  FiTrash2,FiPlus, FiArrowLeft } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { confirmAlert } from 'react-confirm-alert';

const ListaLotesFabricacion = () => {
  const [lotes, setLotes] = useState([]);
  const navigate = useNavigate();

 const fetchLotes = async () => {
      try {
        const res = await api.get("/lotes-fabricados");
        setLotes(res.data);
      } catch (error) {
        toast.error("Error al cargar lotes");
        console.error(error);
      }
    };

  useEffect(() => {
 
    fetchLotes();
  }, []);

 const handleDelete = (id) => {
    confirmAlert({
      title: 'Confirmar eliminación',
      message: '¿Seguro que quieres eliminar este lote?',
      buttons: [
        {
          label: 'Sí',
          onClick: async () => {
            try {
              await api.delete(`/lotes-fabricados/${id}`);
              toast.success('Lote eliminado');
              fetchLotes();
            } catch (error) {
              console.error('Error eliminando Lote', error);
              toast.error('Error al eliminar el Lote');
            }
          },
        },
        { label: 'No', onClick: () => {} },
      ],
    });
  };

  return (
    <div className="p-6">
       <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
              <h2 className="text-4xl font-bold text-gray-800">
                Lotes fabricados
              </h2>
            
              <div className="flex flex-wrap gap-4 w-full md:w-auto items-center">
              
             
                <button
                  onClick={() => navigate("/ordenes_fabricacion")}
                  className="bg-gray-300 hover:bg-gray-400 text-slate-800 px-4 py-2 rounded-md font-semibold h-[42px] flex items-center gap-2 cursor-pointer"
                >
                  <FiArrowLeft />
                  Volver
                </button>
              </div>
            </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm text-left">
          <thead className="bg-slate-200 text-gray-700 uppercase font-semibold">
            <tr className="bg-slate-200 text-gray-700">
              <th className="px-4 py-3">Orden</th>
              <th className="px-4 py-3">Articulo</th>
              <th className="px-4 py-3">Trabajador</th>
              <th className="px-4 py-3">Cantidad</th>
              <th className="px-4 py-3">Fecha</th>
              <th className="px-4 py-3">Observaciones</th>
              <th className="px-4 py-3 text-center">Acciones</th>
               
            </tr>
          </thead>
          <tbody>
            {lotes.map((lote) => (
              <tr key={lote.id_lote} className="hover:bg-slate-300 select-none">
               <td className="px-4 py-2 ">
  #{lote.id_orden_fabricacion} - {lote.nombre_cliente || "Sin cliente"}
</td>
                <td className="px-4 py-2 ">{lote.descripcion_articulo || "N/A"}</td>
                <td className="px-4 py-2 ">{lote.nombre_trabajador || "N/A"}</td>
                <td className="px-4 py-2 ">{lote.cantidad}</td>
                <td className="px-4 py-2 ">
                  {new Date(lote.fecha).toLocaleDateString()}
                </td>
                <td className="px-4 py-2 ">{lote.observaciones || "-"}</td>
                <td className="px-4 py-2 text-center">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDelete(lote.id_lote);
                                        }}
                                        className="text-red-600 hover:text-red-400 transition"
                                        title="Eliminar orden"
                                      >
                                        <FiTrash2 size={18} />
                                      </button>
                                    </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ListaLotesFabricacion;
