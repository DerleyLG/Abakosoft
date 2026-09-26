import React, { useEffect, useMemo, useState } from "react";
import ReporteBase from "../components/ReporteBase";
import api from "../services/api";

const TIPOS_DOCUMENTO = [
  { value: "orden_venta", label: "Venta" },
  { value: "abono_credito", label: "Abono a crédito" },
  { value: "orden_compra", label: "Compra" },
  { value: "cancelacion_orden_compra", label: "Cancelación de compra" },
  { value: "reversion_orden_compra", label: "Reversión de compra" },
  { value: "pago_trabajador", label: "Pago a trabajador" },
  { value: "anticipo", label: "Anticipo" },
  { value: "costo_indirecto", label: "Costo indirecto" },
  { value: "reparacion", label: "Reparación" },
  { value: "devolucion_cliente", label: "Devolución a cliente" },
  { value: "saldo_favor", label: "Abono a saldo a favor" },
  { value: "saldo_favor_usado", label: "Uso de saldo a favor" },
  { value: "transferencia_fondos", label: "Transferencia entre métodos" },
];

const getTipoLabel = (tipo) => {
  const t = String(tipo || "")
    .trim()
    .toLowerCase();
  const found = TIPOS_DOCUMENTO.find((x) => x.value === t);
  if (found) return found.label;
  return t.charAt(0).toUpperCase() + t.slice(1).replace(/_/g, " ");
};

const getDocumentoLabel = (f) => {
  const t = String(f.tipo_documento || "").toLowerCase();
  const id = f.id_documento;
  if (t === "orden_venta") return `OV #${id}`;
  if (t === "abono_credito") return `Abono OV #${id}`;
  if (t === "orden_compra") return `OC #${id}`;
  if (t === "pago_trabajador") return `PT #${id}`;
  if (t === "anticipo") return `ANT #${id}`;
  if (t === "reparacion") return `RP #${id}`;
  if (t === "costo_indirecto") return `CI #${id}`;
  if (t === "saldo_favor") return `SF #${id}`;
  if (t === "saldo_favor_usado") return `SFU #${id}`;
  if (t === "devolucion_cliente") return `DV #${id}`;
  if (t === "transferencia_fondos") return "TR";
  return id ? `#${id}` : "—";
};

const ReporteTesoreriaVentas = () => {
  const titulo = "Tesorería: Movimientos";
  const endpoint = `${import.meta.env.VITE_API_URL}/tesoreria/ventas-cobros`;
  const [summary, setSummary] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [metodos, setMetodos] = useState([]);

  // Cargar clientes para el filtro
  useEffect(() => {
    const cargarClientes = async () => {
      try {
        const res = await api.get("/clientes");
        setClientes(Array.isArray(res.data) ? res.data : []);
      } catch (e) {
        console.error("No se pudieron cargar clientes", e);
      }
    };
    cargarClientes();
  }, []);

  // Cargar métodos de pago para el filtro
  useEffect(() => {
    const cargarMetodos = async () => {
      try {
        const res = await api.get("/tesoreria/metodos-pago");
        setMetodos(Array.isArray(res.data) ? res.data : []);
      } catch (e) {
        console.error("No se pudieron cargar métodos de pago", e);
      }
    };
    cargarMetodos();
  }, []);

  const columnas = [
    { header: "Fecha", accessor: "fecha_movimiento" },
    { header: "Tipo", accessor: (f) => getTipoLabel(f.tipo_documento) },
    { header: "Documento", accessor: (f) => getDocumentoLabel(f) },
    {
      header: "Cliente / Contraparte",
      accessor: (f) => f.contraparte || "—",
    },
    {
      header: "Detalle",
      accessor: (f) => f.referencia || f.observaciones || "",
    },
    { header: "Forma de pago", accessor: (f) => f.nombre_metodo || "—" },
    {
      header: "Ingreso",
      accessor: (f) => (Number(f.monto) > 0 ? Number(f.monto) : ""),
      isCurrency: true,
    },
    {
      header: "Egreso",
      accessor: (f) => (Number(f.monto) < 0 ? Math.abs(Number(f.monto)) : ""),
      isCurrency: true,
    },
  ];

  const filtros = useMemo(
    () => [
      { name: "desde", label: "Desde", type: "datepicker" },
      { name: "hasta", label: "Hasta", type: "datepicker" },
      {
        name: "id_cliente",
        label: "Cliente",
        type: "autocomplete",
        placeholder: "Buscar cliente…",
        opciones: clientes.map((c) => ({
          value: c.id_cliente,
          label: c.nombre,
        })),
      },
      {
        name: "tipo_documento",
        label: "Tipo de documento",
        type: "select",
        placeholder: "Todos los tipos",
        opciones: TIPOS_DOCUMENTO,
      },
      {
        name: "id_metodo_pago",
        label: "Forma de pago",
        type: "select",
        placeholder: "Todas las formas",
        opciones: metodos.map((m) => ({
          value: m.id_metodo_pago,
          label: m.nombre,
        })),
      },
    ],
    [clientes, metodos],
  );

  const handleDataChange = (rows) => {
    try {
      const arr = Array.isArray(rows) ? rows : [];
      const ingresos = arr.reduce(
        (acc, r) => acc + (Number(r?.monto) > 0 ? Number(r.monto) : 0),
        0,
      );
      const egresos = arr.reduce(
        (acc, r) =>
          acc + (Number(r?.monto) < 0 ? Math.abs(Number(r.monto)) : 0),
        0,
      );
      setSummary([
        { label: "Total ingresos", value: ingresos, isCurrency: true },
        { label: "Total egresos", value: egresos, isCurrency: true },
        {
          label: "Flujo neto",
          value: ingresos - egresos,
          isCurrency: true,
        },
        { label: "Movimientos", value: arr.length },
      ]);
    } catch {
      setSummary([]);
    }
  };

  return (
    <ReporteBase
      titulo={titulo}
      endpoint={endpoint}
      filtros={filtros}
      columnas={columnas}
      onDataChange={handleDataChange}
      exportSummary={summary}
      summaryVariant="prominent-all"
    />
  );
};

export default ReporteTesoreriaVentas;
