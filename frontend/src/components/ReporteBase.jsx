import React, { useEffect, useState, useCallback, useMemo } from "react";
import formateaCantidad from "../utils/formateaCantidad";
import api from "../services/api";
import {
  FiLoader,
  FiArrowLeft,
  FiX,
  FiCalendar,
  FiSearch,
} from "react-icons/fi";
import toast from "react-hot-toast";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { useNavigate } from "react-router-dom";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { formatInTimeZone } from "date-fns-tz";

const debounce = (func, delay) => {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      func.apply(this, args);
    }, delay);
  };
};

const ReporteBase = ({
  endpoint,
  columnas,
  titulo,
  filtros = [],
  onDataChange,
  exportSummary = [],
  showSummary = true,
  containerClassName = "p-6",
  summaryVariant = "default",
  // Soporte de vistas (ej: Stock | Por etapas), igual que el módulo de inventario
  vistas = null, // [{ id, label }]
  endpointsPorVista = null, // { [vistaId]: endpoint }
  columnasPorVista = null, // { [vistaId]: columnas }
  filtrosPorVista = null, // { [vistaId]: filtros } — si se define, cada vista tiene sus filtros
  filtrosIniciales = null, // { name: value } precargados (ej: mes actual)
  filtrosClientSide = [], // nombres de filtros que se aplican en el frontend (sin petición)
  filtrarClientSide = null, // (datos, filtrosActivos) => datos filtrados
}) => {
  const timezone = "America/Bogota";

  // Filtros iniciales por defecto: si no se pasan filtrosIniciales y el
  // reporte tiene filtros de fecha (desde/hasta), precargar el mes actual
  // (desde = primer día del mes, hasta = hoy) para temas prácticos.
  const filtrosInicialesPorDefecto = useMemo(() => {
    if (filtrosIniciales) return filtrosIniciales;
    const filtrosFecha = (
      filtrosPorVista && vistas
        ? Object.values(filtrosPorVista).flat()
        : filtros
    ).filter((f) => f && f.type === "datepicker");
    if (filtrosFecha.length === 0) return {};

    const hoy = formatInTimeZone(new Date(), timezone, "yyyy-MM-dd");
    const primerDiaMes = formatInTimeZone(new Date(), timezone, "yyyy-MM-01");
    const iniciales = {};
    filtrosFecha.forEach((f) => {
      const name = String(f.name || "").toLowerCase();
      if (name.includes("desde") || name.includes("inicio")) {
        iniciales[f.name] = primerDiaMes;
      } else if (name.includes("hasta") || name.includes("fin")) {
        iniciales[f.name] = hoy;
      }
    });
    return iniciales;
  }, [filtros, filtrosIniciales, filtrosPorVista, vistas]);

  const [datos, setDatos] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [vistaActiva, setVistaActiva] = useState(vistas?.[0]?.id || null);
  const [filtrosActivos, setFiltrosActivos] = useState(
    filtrosInicialesPorDefecto,
  );
  const [filtrosParaAPI, setFiltrosParaAPI] = useState(
    filtrosInicialesPorDefecto,
  );
  const [internalSummary, setInternalSummary] = useState([]);
  const [paginaLocal, setPaginaLocal] = useState(1);
  const [autocompleteText, setAutocompleteText] = useState({});
  const [autocompleteOpen, setAutocompleteOpen] = useState({});
  const navigate = useNavigate();

  // Filtros client-side: se aplican sobre los datos ya cargados (instantáneo,
  // sin petición al backend). Ej: "Solo con producción" en la vista por etapas.
  const datosFiltrados = useMemo(() => {
    if (filtrarClientSide) {
      return filtrarClientSide(datos, filtrosActivos);
    }
    return datos;
  }, [datos, filtrosActivos, filtrarClientSide]);

  // Paginación client-side: el reporte trae todo (hasta 1000) pero solo se
  // renderizan 50 filas a la vez → la tabla es instantánea aunque haya 400+.
  const FILAS_POR_PAGINA = 50;
  const totalPaginasLocal = Math.max(
    1,
    Math.ceil(datosFiltrados.length / FILAS_POR_PAGINA),
  );
  const filasVisibles = datosFiltrados.slice(
    (paginaLocal - 1) * FILAS_POR_PAGINA,
    paginaLocal * FILAS_POR_PAGINA,
  );

  // Al cambiar datos o vista, volver a la primera página
  useEffect(() => {
    setPaginaLocal(1);
  }, [datosFiltrados, vistaActiva]);

  // Endpoint, columnas y filtros según la vista activa
  const endpointActivo =
    vistas && endpointsPorVista ? endpointsPorVista[vistaActiva] : endpoint;
  const columnasActivas =
    vistas && columnasPorVista ? columnasPorVista[vistaActiva] : columnas;
  const filtrosActivosVista =
    filtrosPorVista && vistas ? filtrosPorVista[vistaActiva] : filtros;

  const formatDateCell = (value) => {
    if (!value) return "";
    if (typeof value === "string") {
      const ymd = value.slice(0, 10);
      if (/^\d{4}-\d{2}-\d{2}$/.test(ymd)) {
        const [y, m, d] = ymd.split("-");
        return `${d}/${m}/${y}`;
      }
    }
    try {
      return new Date(value).toLocaleDateString("es-CO", {
        timeZone: "America/Bogota",
      });
    } catch {
      return String(value);
    }
  };

  const obtenerDatos = useCallback(async () => {
    try {
      setCargando(true);
      const params = { ...filtrosParaAPI };
      // Los reportes no pagan: traer todos los registros (el backend limita a 1000)
      params.pageSize = 1000;
      // Los filtros client-side no van al backend (se aplican en el frontend)
      filtrosClientSide.forEach((f) => delete params[f]);
      // En la vista "Por etapas" el filtro "sin_produccion" no aplica
      // (el endpoint por-etapas solo lista artículos con producción activa).
      if (vistaActiva === "etapas" && params.id_etapa === "sin_produccion") {
        delete params.id_etapa;
      }
      const res = await api.get(endpointActivo, { params });

      // Soportar forma { data, summary }
      let datosProcesados = Array.isArray(res.data)
        ? res.data
        : res.data?.data || [];
      const summaryFromRes = Array.isArray(res.data?.summary)
        ? res.data.summary
        : [];
      setInternalSummary(summaryFromRes);
      setDatos(datosProcesados);
      try {
        onDataChange && onDataChange(datosProcesados);
      } catch {}
    } catch (error) {
      console.error("Error al cargar los datos:", error);
      toast.error(
        `Error al cargar los datos: ${
          error.response?.data?.message || error.message
        }`,
      );
      try {
        onDataChange && onDataChange([]);
      } catch {}
    } finally {
      setCargando(false);
    }
  }, [endpointActivo, filtrosParaAPI, vistaActiva]);

  useEffect(() => {
    obtenerDatos();
  }, [obtenerDatos]);

  const debouncedSetFiltrosParaAPI = useCallback(
    debounce((newFiltros) => {
      setFiltrosParaAPI(newFiltros);
    }, 300),
    [],
  );

  const handleChangeFiltro = (name, value) => {
    const newFiltros = { ...filtrosActivos, [name]: value };
    setFiltrosActivos(newFiltros);
    // Los filtros client-side no disparan petición: se aplican al instante
    if (filtrosClientSide.includes(name)) return;
    debouncedSetFiltrosParaAPI(newFiltros);
  };

  // Cambia la vista (ej: Stock | Por etapas) y recarga con el endpoint correspondiente
  const cambiarVista = (vistaId) => {
    if (vistaId === vistaActiva) return;
    setVistaActiva(vistaId);
    setDatos([]);
    setInternalSummary([]);
    // Limpiar filtros que no aplican a la nueva vista (ej: etapa solo en "Por etapas")
    if (filtrosPorVista) {
      const filtrosNuevaVista = filtrosPorVista[vistaId] || [];
      const nuevosFiltros = {};
      Object.keys(filtrosActivos).forEach((name) => {
        if (filtrosNuevaVista.some((f) => f.name === name)) {
          nuevosFiltros[name] = filtrosActivos[name];
        }
      });
      setFiltrosActivos(nuevosFiltros);
      setFiltrosParaAPI(nuevosFiltros);
    }
  };

  const generarPDF = () => {
    try {
      if (!datosFiltrados || datosFiltrados.length === 0)
        return toast.error("No hay datos para exportar");
      const doc = new jsPDF({ unit: "pt", format: "a4" });
      const headers = columnasActivas.map((c) => c.header);
      const body = datosFiltrados.map((row) => {
        return columnasActivas.map((col) => {
          let value;
          if (typeof col.accessor === "function") {
            value = col.accessor(row);
          } else {
            value = row[col.accessor];
          }

          const isDateColumn = [
            "fecha_registro",
            "ultima_actualizacion",
            "fecha",
            "fecha_pago",
            "fecha_inicio",
            "fecha_movimiento",
          ].includes(col.accessor);
          if (isDateColumn && value) return formatDateCell(value);
          if (col.isCurrency) return formatCurrencyCOP(value);
          return value == null ? "" : String(value);
        });
      });

      doc.setFontSize(14);
      doc.text(titulo || "Reporte", 40, 40);
      doc.setFontSize(10);
      const dateStr = new Date().toLocaleString();
      doc.text(`Generado: ${dateStr}`, 40, 56);

      let startY = 80;
      const summaryToUse =
        exportSummary && exportSummary.length > 0
          ? exportSummary
          : internalSummary;
      if (Array.isArray(summaryToUse) && summaryToUse.length > 0) {
        let y = 76;
        doc.setFontSize(11);
        summaryToUse.forEach((item) => {
          const label = item?.label ? String(item.label) : "";
          const valueNum =
            typeof item?.value === "string"
              ? parseFloat(item.value)
              : Number(item?.value);
          const valueStr = item?.isCurrency
            ? formatCurrencyCOP(valueNum)
            : (item?.value ?? "");
          doc.text(`${label}: ${valueStr}`, 40, y);
          y += 16;
        });
        startY = y + 8;
      }

      autoTable(doc, {
        startY,
        head: [headers],
        body: body,
        theme: "striped",
        styles: { fontSize: 9 },
        headStyles: { fillColor: [44, 62, 80], textColor: 255 },
      });

      const fileName = `${(titulo || "reporte").replace(
        /\s+/g,
        "_",
      )}_${new Date().toISOString().slice(0, 10)}.pdf`;
      doc.save(fileName);
      toast.success("PDF generado");
    } catch (e) {
      console.error("Error generando PDF", e);
      toast.error("Error al generar PDF");
    }
  };

  const handleDownloadExcel = () => {
    try {
      if (!datosFiltrados || datosFiltrados.length === 0)
        return toast.error("No hay datos para exportar");

      const headers = columnasActivas.map(
        (c) =>
          c.header || (typeof c.accessor === "string" ? c.accessor : "col"),
      );
      const rows = datosFiltrados.map((row) => {
        return columnasActivas.map((col) => {
          let value;
          if (typeof col.accessor === "function") value = col.accessor(row);
          else value = row[col.accessor];

          const isDateColumn = [
            "fecha_registro",
            "ultima_actualizacion",
            "fecha",
            "fecha_pago",
            "fecha_inicio",
            "fecha_movimiento",
          ].includes(col.accessor);
          if (isDateColumn && value) return formatDateCell(value);

          if (col.isCurrency) {
            const num =
              typeof value === "string"
                ? parseFloat(value.replace(/[^0-9.-]+/g, ""))
                : Number(value);
            return isNaN(num) ? "" : num;
          }

          return value == null ? "" : value;
        });
      });

      const aoa = [];
      const summaryToUse =
        exportSummary && exportSummary.length > 0
          ? exportSummary
          : internalSummary;
      if (Array.isArray(summaryToUse) && summaryToUse.length > 0) {
        summaryToUse.forEach((item) => {
          const label = item?.label ? String(item.label) : "";
          const valueNum =
            typeof item?.value === "string"
              ? parseFloat(item.value.replace(/[^0-9.-]+/g, ""))
              : Number(item?.value);
          const valueCell = item?.isCurrency
            ? isNaN(valueNum)
              ? ""
              : valueNum
            : (item?.value ?? "");
          aoa.push([label, valueCell]);
        });
        aoa.push([]);
      }
      aoa.push(headers);
      rows.forEach((r) => aoa.push(r));
      const ws = XLSX.utils.aoa_to_sheet(aoa);

      const numCols = Math.max(...aoa.map((row) => row.length));
      const colWidths = Array.from({ length: numCols }).map((_, colIndex) => {
        let max = 0;
        aoa.forEach((row) => {
          const cell = row[colIndex];
          const len = cell == null ? 0 : String(cell).length;
          if (len > max) max = len;
        });
        return { wch: Math.min(Math.max(max + 2, 10), 50) };
      });
      ws["!cols"] = colWidths;

      columnasActivas.forEach((col, colIndex) => {
        if (col.isCurrency) {
          const headerRowIndex = aoa.findIndex((r) => r === headers);
          for (let r = headerRowIndex + 1; r <= aoa.length; r++) {
            const cellAddress = XLSX.utils.encode_cell({
              c: colIndex,
              r: r - 1,
            });
            const cell = ws[cellAddress];
            if (cell && typeof cell.v === "number") {
              cell.t = "n";

              cell.z = "#,##0";
            }
          }
        }
      });

      if (Array.isArray(summaryToUse) && summaryToUse.length > 0) {
        summaryToUse.forEach((item, idx) => {
          if (item?.isCurrency) {
            const cellAddress = XLSX.utils.encode_cell({ c: 1, r: idx });
            const cell = ws[cellAddress];
            if (cell && typeof cell.v === "number") {
              cell.t = "n";
              cell.z = "#,##0";
            }
          }
        });
      }

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Reporte");
      const fileName = `${(titulo || "reporte").replace(
        /\s+/g,
        "_",
      )}_${new Date().toISOString().slice(0, 10)}.xlsx`;
      XLSX.writeFile(wb, fileName);
      toast.success("Excel descargado");
    } catch (e) {
      console.error("Error exportando Excel", e);
      toast.error("Error al exportar Excel");
    }
  };

  const formatCurrencyCOP = (value) => {
    if (value === null || value === undefined) {
      return "";
    }
    const numValue = typeof value === "string" ? parseFloat(value) : value;
    if (isNaN(numValue)) {
      return String(value);
    }
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(numValue);
  };

  const effectiveSummary =
    exportSummary && exportSummary.length > 0 ? exportSummary : internalSummary;

  return (
    <div className={containerClassName}>
      <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold text-slate-700">{titulo}</h1>
          {/* Segmented control de vistas (igual que el módulo de inventario) */}
          {vistas && vistas.length > 0 && (
            <div
              className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-300 w-fit shadow-sm"
              role="group"
              aria-label="Vista del reporte"
            >
              {vistas.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => cambiarVista(v.id)}
                  aria-pressed={vistaActiva === v.id}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                    vistaActiva === v.id
                      ? "bg-slate-900 text-white shadow-sm"
                      : "text-slate-500 hover:bg-slate-100"
                  }`}
                >
                  {v.label}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleDownloadExcel}
            className="bg-green-800 hover:bg-green-900 text-white px-4 py-2 rounded-md cursor-pointer"
            disabled={cargando || datosFiltrados.length === 0}
          >
            Exportar Excel
          </button>
          <button
            onClick={generarPDF}
            className="bg-slate-600 hover:bg-slate-800 text-white px-4 py-2 rounded-md cursor-pointer"
            disabled={cargando || datosFiltrados.length === 0}
          >
            Exportar PDF
          </button>
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded-md font-semibold cursor-pointer"
            disabled={cargando}
          >
            <FiArrowLeft />
            <span>Volver</span> 
          </button>
        </div>
      </div>
      {filtrosActivosVista.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-3 mb-4">
          <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-2.5">
            {filtrosActivosVista.map((filtro) => (
              <div key={filtro.name} className="flex flex-col">
                {filtro.type !== "checkbox" && (
                  <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1">
                    {filtro.label}
                  </label>
                )}
                {filtro.type === "datepicker" ? (
                  <div className="relative">
                    <FiCalendar
                      size={15}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                    />
                    <DatePicker
                      selected={
                        filtrosActivos[filtro.name]
                          ? new Date(filtrosActivos[filtro.name] + "T00:00:00")
                          : null
                      }
                      onChange={(date) => {
                        if (date) {
                          const formattedDate = formatInTimeZone(
                            date,
                            timezone,
                            "yyyy-MM-dd",
                          );
                          handleChangeFiltro(filtro.name, formattedDate);
                        } else {
                          handleChangeFiltro(filtro.name, null);
                        }
                      }}
                      dateFormat="yyyy-MM-dd"
                      className="w-full pl-9 pr-10 py-2 text-sm bg-white border border-slate-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent placeholder:text-slate-400 transition"
                      disabled={cargando}
                      placeholderText={filtro.label}
                    />
                    {filtrosActivos[filtro.name] && (
                      <button
                        type="button"
                        onClick={() => handleChangeFiltro(filtro.name, null)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 z-10 inline-flex items-center justify-center w-5 h-5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                        title="Limpiar"
                      >
                        <FiX size={13} />
                      </button>
                    )}
                  </div>
                ) : filtro.type === "autocomplete" ? (
                  <div className="relative">
                    <FiSearch
                      size={15}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                    />
                    <input
                      type="text"
                      name={filtro.name}
                      placeholder={filtro.placeholder || filtro.label}
                      value={autocompleteText[filtro.name] ?? ""}
                      onChange={(e) => {
                        const texto = e.target.value;
                        setAutocompleteText((prev) => ({
                          ...prev,
                          [filtro.name]: texto,
                        }));
                        setAutocompleteOpen((prev) => ({
                          ...prev,
                          [filtro.name]: true,
                        }));
                        // Si el texto cambia, limpiar el valor seleccionado
                        if (filtrosActivos[filtro.name]) {
                          handleChangeFiltro(filtro.name, "");
                        }
                      }}
                      onFocus={() =>
                        setAutocompleteOpen((prev) => ({
                          ...prev,
                          [filtro.name]: true,
                        }))
                      }
                      onBlur={() => {
                        // Al perder foco, restaurar el label del valor seleccionado
                        setTimeout(() => {
                          setAutocompleteOpen((prev) => ({
                            ...prev,
                            [filtro.name]: false,
                          }));
                          const valor = filtrosActivos[filtro.name];
                          if (valor) {
                            const op = (filtro.opciones || []).find(
                              (o) => String(o.value) === String(valor),
                            );
                            setAutocompleteText((prev) => ({
                              ...prev,
                              [filtro.name]: op ? op.label : "",
                            }));
                          } else {
                            setAutocompleteText((prev) => ({
                              ...prev,
                              [filtro.name]: "",
                            }));
                          }
                        }, 150);
                      }}
                      className="w-full pl-9 pr-8 py-2 text-sm bg-white border border-slate-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent placeholder:text-slate-400 transition"
                      disabled={cargando}
                    />
                    {filtrosActivos[filtro.name] && (
                      <button
                        type="button"
                        onClick={() => {
                          handleChangeFiltro(filtro.name, "");
                          setAutocompleteText((prev) => ({
                            ...prev,
                            [filtro.name]: "",
                          }));
                        }}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 z-10 inline-flex items-center justify-center w-5 h-5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                        title="Limpiar"
                      >
                        <FiX size={13} />
                      </button>
                    )}
                    {autocompleteOpen[filtro.name] && (
                      <div className="absolute z-20 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-56 overflow-y-auto">
                        {(filtro.opciones || [])
                          .filter((o) => {
                            const texto = (
                              autocompleteText[filtro.name] || ""
                            ).toLowerCase();
                            if (!texto) return true;
                            return String(o.label || "")
                              .toLowerCase()
                              .includes(texto);
                          })
                          .slice(0, 8)
                          .map((opcion) => (
                            <button
                              key={opcion.value}
                              type="button"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                handleChangeFiltro(filtro.name, opcion.value);
                                setAutocompleteText((prev) => ({
                                  ...prev,
                                  [filtro.name]: opcion.label,
                                }));
                                setAutocompleteOpen((prev) => ({
                                  ...prev,
                                  [filtro.name]: false,
                                }));
                              }}
                              className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 cursor-pointer"
                            >
                              {opcion.label}
                            </button>
                          ))}
                        {(filtro.opciones || []).filter((o) => {
                          const texto = (
                            autocompleteText[filtro.name] || ""
                          ).toLowerCase();
                          if (!texto) return true;
                          return String(o.label || "")
                            .toLowerCase()
                            .includes(texto);
                        }).length === 0 && (
                          <div className="px-3 py-2 text-sm text-slate-400">
                            Sin resultados
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : filtro.type === "select" ? (
                  <select
                    name={filtro.name}
                    value={filtrosActivos[filtro.name] || ""}
                    onChange={(e) =>
                      handleChangeFiltro(e.target.name, e.target.value)
                    }
                    className="w-full text-sm bg-white border border-slate-200 rounded-lg px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent cursor-pointer"
                    disabled={cargando}
                  >
                    <option value="">{filtro.placeholder || "Todos"}</option>
                    {(filtro.opciones || []).map((opcion) => (
                      <option key={opcion.value} value={opcion.value}>
                        {opcion.label}
                      </option>
                    ))}
                  </select>
                ) : filtro.type === "checkbox" ? (
                  <>
                    <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1">
                      {filtro.label}
                    </label>
                    <label
                      className={`inline-flex items-center justify-between gap-2 w-full text-sm cursor-pointer select-none bg-white border rounded-lg px-3 shadow-sm transition h-9 ${
                        filtrosActivos[filtro.name]
                          ? "border-slate-700 bg-slate-50"
                          : "border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <span className="text-xs font-medium text-slate-600">
                        Activo
                      </span>
                      <input
                        type="checkbox"
                        name={filtro.name}
                        checked={!!filtrosActivos[filtro.name]}
                        onChange={(e) =>
                          handleChangeFiltro(
                            e.target.name,
                            e.target.checked ? "1" : "",
                          )
                        }
                        className="w-4 h-4 accent-slate-700 cursor-pointer"
                        disabled={cargando}
                      />
                    </label>
                  </>
                ) : (
                  <div className="relative">
                    {filtro.type === "text" && (
                      <FiSearch
                        size={15}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                      />
                    )}
                    <input
                      type={filtro.type || "text"}
                      name={filtro.name}
                      placeholder={filtro.placeholder || filtro.label}
                      value={filtrosActivos[filtro.name] || ""}
                      onChange={(e) =>
                        handleChangeFiltro(e.target.name, e.target.value)
                      }
                      className={`w-full text-sm bg-white border border-slate-200 rounded-lg py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent placeholder:text-slate-400 transition ${
                        filtro.type === "text" ? "pl-9 pr-3" : "px-3"
                      }`}
                      disabled={cargando}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      {showSummary &&
        Array.isArray(effectiveSummary) &&
        effectiveSummary.length > 0 &&
        (summaryVariant === "prominent-all" ? (
          <div className="mb-4">
            <div className="rounded-xl p-5 bg-slate-50 border border-slate-200 text-slate-800 shadow-sm">
              <div className="flex flex-wrap gap-6">
                {effectiveSummary.map((item, idx) => (
                  <div key={idx} className="min-w-[220px]">
                    <div className="text-sm text-slate-600">
                      {item?.label ?? ""}
                    </div>
                    <div className="font-bold text-emerald-600">
                      {item?.isCurrency
                        ? formatCurrencyCOP(item?.value)
                        : (item?.value ?? "")}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          (() => {
            const primary =
              effectiveSummary.find((i) => i && i.isCurrency) ||
              effectiveSummary[0];
            const others = effectiveSummary.filter((i) => i && i !== primary);
            return (
              <div className="mb-4">
                <div className="rounded-xl p-5 bg-slate-50 border border-slate-200 text-slate-800 shadow-sm flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 flex items-baseline flex-wrap gap-x-3 gap-y-1">
                    <span>{primary?.label ?? "Total"}</span>
                    <span className="pl-5 text-green-600 font-bold">
                      {primary?.isCurrency
                        ? formatCurrencyCOP(primary?.value)
                        : (primary?.value ?? "")}
                    </span>
                  </div>
                  {others.length > 0 && (
                    <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm">
                      {others.map((item, idx) => (
                        <div key={idx}>
                          <span className="font-medium text-slate-600">
                            {item?.label ?? ""}:
                          </span>
                          <span className="font-semibold text-slate-900">
                            {item?.isCurrency
                              ? formatCurrencyCOP(item?.value)
                              : (item?.value ?? "")}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })()
        ))}
      <div className="overflow-x-auto bg-white rounded-lg shadow border border-slate-200">
        {cargando ? (
          <div className="text-center p-8 text-slate-500 flex justify-center items-center gap-2">
            <FiLoader className="animate-spin" /> Cargando datos...
          </div>
        ) : (
          <table className="min-w-full text-sm border-spacing-0 border border-gray-300 rounded-lg overflow-hidden text-left">
            <thead className="bg-slate-100">
              <tr>
                {columnasActivas.map((col) => (
                  <th
                    key={col.accessor}
                    className="text-left px-4 py-2 font-medium border-b border-gray-300"
                  >
                    {col.header} 
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {datosFiltrados.length === 0 ? (
                <tr>
                  <td
                    colSpan={columnasActivas.length}
                    className="text-center text-slate-400 py-6"
                  >
                    No hay datos para mostrar.
                  </td>
                </tr>
              ) : (
                filasVisibles.map((fila, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    {columnasActivas.map((col) => (
                      <td
                        key={col.accessor}
                        className="px-2 py-2 border-b border-gray-300"
                      >
                        {(() => {
                          let value;
                          if (typeof col.accessor === "function") {
                            value = col.accessor(fila);
                          } else {
                            value = fila[col.accessor];
                          }

                          const isDateColumn = [
                            "fecha_registro",
                            "ultima_actualizacion",
                            "fecha",
                            "fecha_pago",
                            "fecha_inicio",
                            "fecha_movimiento",
                          ].includes(col.accessor);

                          if (value == null || value === "") {
                            return <span className="text-slate-400">--</span>;
                          }

                          if (isDateColumn && value) {
                            return formatDateCell(value);
                          }

                          if (col.isCurrency) {
                            return formatCurrencyCOP(value);
                          }

                          // Formatear cantidades para columnas marcadas como esCantidad
                          if (col.esCantidad) {
                            return formateaCantidad(value);
                          }

                          return value;
                        })()}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
        {/* Paginación client-side */}
        {!cargando && datosFiltrados.length > FILAS_POR_PAGINA && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 bg-white">
            <p className="text-xs text-slate-500">
              Mostrando {(paginaLocal - 1) * FILAS_POR_PAGINA + 1}–
              {Math.min(paginaLocal * FILAS_POR_PAGINA, datosFiltrados.length)}{" "}
              de {datosFiltrados.length}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPaginaLocal((p) => Math.max(1, p - 1))}
                disabled={paginaLocal <= 1}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 text-slate-600 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                Anterior
              </button>
              <span className="text-xs font-semibold text-slate-600">
                {paginaLocal} / {totalPaginasLocal}
              </span>
              <button
                onClick={() =>
                  setPaginaLocal((p) => Math.min(totalPaginasLocal, p + 1))
                }
                disabled={paginaLocal >= totalPaginasLocal}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 text-slate-600 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReporteBase;
