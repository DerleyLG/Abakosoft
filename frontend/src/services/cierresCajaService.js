import api from "./api";

const cierresCajaService = {
  /**
   * Obtener todos los cierres (histórico)
   */
  getAll: async () => {
    const response = await api.get("/cierres-caja");
    return response.data;
  },

  /**
   * Obtener cierre actual (abierto)
   */
  getCierreAbierto: async () => {
    const response = await api.get("/cierres-caja/abierto");
    return response.data;
  },

  /**
   * Obtener detalle de un cierre específico
   */
  getById: async (id) => {
    const response = await api.get(`/cierres-caja/${id}`);
    return response.data;
  },

  /**
   * Obtener movimientos de un período
   */
  getMovimientos: async (id) => {
    const response = await api.get(`/cierres-caja/${id}/movimientos`);
    return response.data;
  },

  /**
   * Crear nuevo período inicial
   */
  create: async (data) => {
    const response = await api.post("/cierres-caja", data);
    return response.data;
  },

  /**
   * Cerrar un período
   */
  cerrar: async (id, data) => {
    const response = await api.post(`/cierres-caja/${id}/cerrar`, data);
    return response.data;
  },

  /**
   * Validar si una fecha está cerrada
   */
  validarFecha: async (fecha) => {
    const response = await api.post("/cierres-caja/validar-fecha", { fecha });
    return response.data;
  },
};

export default cierresCajaService;
