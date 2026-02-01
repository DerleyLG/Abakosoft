import api from "./api";

const consumoMateriaPrimaService = {
  // Obtener costos prorrateados y totales por artículo en una orden
  getCostosPorArticulo: async (idOrden) => {
    const response = await api.get(
      `/consumos-materia-prima/costos-por-articulo/${idOrden}`,
    );
    return response.data;
  },
};

export default consumoMateriaPrimaService;
