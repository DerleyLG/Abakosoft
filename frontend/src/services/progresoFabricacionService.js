import api from "./api";

const progresoFabricacionService = {
  // Obtener progreso detallado con filtros opcionales
  getProgresoDetallado: async (params = {}) => {
    const response = await api.get("/progreso-fabricacion", { params });
    return response.data;
  },

  // Obtener resumen por orden de fabricación
  getResumenPorOrden: async (params = {}) => {
    const response = await api.get("/progreso-fabricacion/resumen", { params });
    return response.data;
  },

  // Obtener estimación de materia prima consumida por período
  getResumenMateriaPrima: async (fechaInicio, fechaFin) => {
    const response = await api.get("/progreso-fabricacion/materia-prima", {
      params: { fechaInicio, fechaFin },
    });
    return response.data;
  },

  // Obtener progreso de una orden específica
  getProgresoOrden: async (idOrden) => {
    const response = await api.get(`/progreso-fabricacion/orden/${idOrden}`);
    return response.data;
  },

  // Obtener costos prorrateados y totales por artículo en una orden
  getCostosPorArticulo: async (idOrden) => {
    const response = await api.get(
      `/progreso-fabricacion/costos-por-articulo/${idOrden}`,
    );
    return response.data;
  },
};

export default progresoFabricacionService;
