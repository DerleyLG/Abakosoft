import React, { useState, useEffect, useRef } from "react";
import { FiArrowLeft } from "react-icons/fi";
import { useNavigate, useLocation } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../services/api";
import AsyncSelect from "react-select/async";
import { useIdempotencyKey } from "../hooks/useIdempotencyKey";

const CostosIndirectosNuevo = () => {
  const idempotencyKey = useIdempotencyKey();
  const [allMetodosPago, setAllMetodosPago] = useState([]);
  const [pagoData, setPagoData] = useState({
    id_metodo_pago: "",
    referencia: "",
    observaciones_pago: "",
  });
  const navigate = useNavigate();
  const location = useLocation();

  const [usarPeriodo, setUsarPeriodo] = useState(false);
  const [fechaRegistro, setFechaRegistro] = useState(
    new Date().toISOString().split("T")[0],
  );

  const [tipoCosto, setTipoCosto] = useState("");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [valor, setValor] = useState(""); // texto formateado COP
  const [observaciones, setObservaciones] = useState("");
  const [ofSeleccionada, setOfSeleccionada] = useState(null);
  const [asignarAOF, setAsignarAOF] = useState(false);
  const [asignacionMultiple, setAsignacionMultiple] = useState(false);
  const [ofsSeleccionadas, setOfsSeleccionadas] = useState([]); // para múltiple
  const [montosAsignados, setMontosAsignados] = useState({}); // { idOF: valorCOPNumber }
  const [driver, setDriver] = useState("cantidad"); // cantidad | avances | costo
  // Sugerencias (vista previa) para auto-distribución por driver
  const [sugerencias, setSugerencias] = useState([]); // [{ id_orden_fabricacion, driver_valor, peso, valor_asignado? }]
  const [mostrarDetalle, setMostrarDetalle] = useState(false);
  const ofCardRef = useRef(null);

  // Cargar métodos de pago (hook separado y al tope)
  useEffect(() => {
    (async () => {
      try {
        const res = await api.get("/metodos-pago");
        setAllMetodosPago(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        setAllMetodosPago([]);
      }
    })();
  }, []);

  // Prefill de OF si navegamos desde Órdenes de Fabricación
  useEffect(() => {
    const preId = location.state?.id_orden_fabricacion;
    if (!preId) return;
    (async () => {
      try {
        const res = await api.get(`/ordenes-fabricacion/${preId}`);
        const ord = res.data;
        if (ord?.id_orden_fabricacion) {
          setAsignarAOF(true);
          setOfSeleccionada({
            value: ord.id_orden_fabricacion,
            label: `OF #${ord.id_orden_fabricacion} — ${
              ord.nombre_cliente || "Sin cliente"
            }`,
          });
        }
      } catch (e) {
        console.error("No se pudo pre-cargar la OF:", e);
      }
    })();
  }, [location.state]);

  // Cargador de opciones de OF filtrando por cliente
  const cargarOFs = async (inputValue) => {
    try {
      const params = {
        buscar: inputValue || "",
        page: 1,
        pageSize: 20,
        sortBy: "id",
        sortDir: "desc",
        estados: "pendiente,en proceso,completada",
      };
      const res = await api.get("/ordenes-fabricacion", { params });
      const rows = Array.isArray(res.data?.data) ? res.data.data : [];
      return rows.map((o) => ({
        value: o.id_orden_fabricacion,
        label: `OF #${o.id_orden_fabricacion} — ${
          o.nombre_cliente || "Sin cliente"
        }${o.estado === "completada" ? " (Completada)" : ""}`,
      }));
    } catch (e) {
      console.error("Error cargando OFs:", e);
      return [];
    }
  };

  // Helpers COP
  const formatCOP = (number) => {
    const n = Number(number) || 0;
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      maximumFractionDigits: 0,
    }).format(n);
  };
  const cleanCOP = (s) => {
    if (s === null || s === undefined) return 0;
    const onlyNums = String(s).replace(/[^0-9]/g, "");
    return parseInt(onlyNums, 10) || 0;
  };
  const valorNumerico = cleanCOP(valor);

  // Limpiar sugerencias si cambian insumos clave (valor, driver)
  useEffect(() => {
    setSugerencias([]);
    setMostrarDetalle(false);
  }, [valor, driver]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validar fechas según el modo
    if (usarPeriodo) {
      if (!fechaInicio || !fechaFin) {
        toast.error("Por favor, selecciona fecha de inicio y fecha de fin.");
        return;
      }
      if (new Date(fechaInicio) > new Date(fechaFin)) {
        toast.error(
          "La fecha de inicio no puede ser posterior a la fecha de fin.",
        );
        return;
      }
      if (fechaInicio === fechaFin) {
        toast.error("La fecha de fin debe ser diferente a la fecha de inicio.");
        return;
      }
    }

    // Validaciones para el formulario de costo indirecto
    if (!tipoCosto || !valorNumerico) {
      toast.error("Por favor, completa todos los campos obligatorios.");
      return;
    }
    if (Number(valorNumerico) <= 0) {
      toast.error("El valor del costo indirecto debe ser mayor a cero.");
      return;
    }

    // Validar que se haya ingresado fecha de registro
    if (!fechaRegistro) {
      toast.error("Por favor, selecciona una fecha de registro.");
      return;
    }

    const payload = {
      tipo_costo: tipoCosto,
      fecha: fechaRegistro, // Fecha ingresada por el usuario en el formulario
      fecha_inicio: usarPeriodo ? fechaInicio : null, // Fechas de vigencia (solo referencia)
      fecha_fin: usarPeriodo ? fechaFin : null, // Fechas de vigencia (solo referencia)
      valor: Number(valorNumerico),
      observaciones: observaciones || null,
      ...(asignarAOF && !asignacionMultiple && ofSeleccionada?.value
        ? { id_orden_fabricacion: ofSeleccionada.value }
        : {}),
      ...(asignarAOF && asignacionMultiple
        ? {
            asignaciones: ofsSeleccionadas
              .map((opt) => ({
                id_orden_fabricacion: opt.value,
                valor_asignado: Number(montosAsignados[opt.value] || 0),
              }))
              .filter((a) => a.valor_asignado > 0),
          }
        : {}),
      id_metodo_pago: pagoData.id_metodo_pago || undefined,
      referencia: pagoData.referencia || undefined,
      observaciones_pago: pagoData.observaciones_pago || undefined,
    };

    // Validar que el método de pago sea obligatorio
    if (!pagoData.id_metodo_pago) {
      toast.error("El método de pago es obligatorio");
      return;
    }

    if (asignarAOF && asignacionMultiple) {
      const suma = (payload.asignaciones || []).reduce(
        (acc, a) => acc + Number(a.valor_asignado || 0),
        0,
      );
      if (suma !== valorNumerico) {
        toast.error(
          "La suma de los valores asignados debe ser exactamente igual al valor del costo.",
        );
        return;
      }
      if (!payload.asignaciones || payload.asignaciones.length === 0) {
        toast.error("Selecciona al menos una OF y define sus valores.");
        return;
      }
    }

    try {
      await api.post("/costos-indirectos", payload, {
        headers: { "X-Idempotency-Key": idempotencyKey },
      });
      toast.success("Costo indirecto registrado correctamente");
      navigate("/costos_indirectos");
    } catch (error) {
      console.error(
        "Error al registrar el costo indirecto:",
        error.response?.data || error.message,
      );
      toast.error(
        error.response?.data?.error ||
          error.response?.data?.message ||
          "Error al registrar el costo indirecto.",
      );
    }
  };

  const labelCls =
    "block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1";
  const inputCls =
    "w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-400 transition placeholder:text-slate-400";
  const selectCls =
    "w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-400 transition";

  return (
    <div className="min-h-[calc(100vh-68px)] bg-slate-50 px-4 md:px-8 xl:px-12 py-6 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 leading-tight">
            Registrar costo indirecto
          </h1>
        </div>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 shadow-sm transition-colors cursor-pointer"
        >
          <FiArrowLeft size={14} /> Volver
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* Card 1 — Datos del costo */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-2 h-2 rounded-full bg-indigo-500" />
            <h2 className="text-sm font-semibold text-slate-700">
              Datos del costo
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>
                Tipo de costo <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={tipoCosto}
                onChange={(e) => setTipoCosto(e.target.value)}
                required
                placeholder="Ej: Arrendamiento, Servicios públicos…"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>
                Valor <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={valor}
                onChange={(e) => {
                  const num = cleanCOP(e.target.value);
                  setValor(num ? formatCOP(num) : "");
                }}
                placeholder="$ 0"
                inputMode="numeric"
                required
                className={inputCls}
              />
            </div>
            <div className="md:col-span-2">
              <label className={labelCls}>Observaciones</label>
              <textarea
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                rows="2"
                className={inputCls}
                placeholder="Opcional"
              />
            </div>
            <div className="md:col-span-2">
              <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  id="usarPeriodo"
                  checked={usarPeriodo}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setUsarPeriodo(checked);
                    if (!checked) {
                      setFechaInicio("");
                      setFechaFin("");
                    }
                  }}
                  className="h-4 w-4 rounded border-slate-300 text-slate-700 focus:ring-slate-400 cursor-pointer"
                />
                <span className="text-sm text-slate-700 font-medium">
                  Registrar con período de vigencia (fecha inicio y fecha fin)
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* Card 2 — Fechas */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <h2 className="text-sm font-semibold text-slate-700">
              {usarPeriodo ? "Período de vigencia" : "Fecha de registro"}
            </h2>
          </div>
          {!usarPeriodo ? (
            <div className="max-w-xs">
              <label className={labelCls}>
                Fecha de registro <span className="text-red-400">*</span>
              </label>
              <input
                type="date"
                value={fechaRegistro}
                onChange={(e) => setFechaRegistro(e.target.value)}
                required
                className={inputCls}
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>
                  Fecha inicio <span className="text-red-400">*</span>
                </label>
                <input
                  type="date"
                  value={fechaInicio}
                  onChange={(e) => setFechaInicio(e.target.value)}
                  required
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>
                  Fecha fin <span className="text-red-400">*</span>
                </label>
                <input
                  type="date"
                  value={fechaFin}
                  onChange={(e) => setFechaFin(e.target.value)}
                  required
                  className={inputCls}
                />
              </div>
              <p className="md:col-span-2 text-xs text-slate-400 -mt-1">
                Al usar período, la fecha de registro se toma automáticamente
                como la fecha de inicio.
              </p>
            </div>
          )}
        </div>

        {/* Card 3 — Datos de pago */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <h2 className="text-sm font-semibold text-slate-700">
              Datos de pago
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className={labelCls}>
                Método de pago <span className="text-red-400">*</span>
              </label>
              <select
                value={pagoData.id_metodo_pago}
                onChange={(e) =>
                  setPagoData((prev) => ({
                    ...prev,
                    id_metodo_pago: e.target.value,
                  }))
                }
                required
                className={selectCls}
              >
                <option value="">Selecciona método…</option>
                {allMetodosPago.map((m) => (
                  <option key={m.id_metodo_pago} value={m.id_metodo_pago}>
                    {m.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Referencia / No. transacción</label>
              <input
                type="text"
                value={pagoData.referencia}
                onChange={(e) =>
                  setPagoData((prev) => ({
                    ...prev,
                    referencia: e.target.value,
                  }))
                }
                placeholder="Ej: No. de cuenta"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Observaciones del pago</label>
              <input
                type="text"
                value={pagoData.observaciones_pago}
                onChange={(e) =>
                  setPagoData((prev) => ({
                    ...prev,
                    observaciones_pago: e.target.value,
                  }))
                }
                placeholder="Opcional"
                className={inputCls}
              />
            </div>
          </div>
        </div>

        {/* Card 4 — Asignación a OF */}
        <div
          ref={ofCardRef}
          className="bg-white border border-slate-200 rounded-xl shadow-sm p-5"
        >
          <div className="flex items-center gap-2 mb-4">
            <span className="w-2 h-2 rounded-full bg-slate-500" />
            <h2 className="text-sm font-semibold text-slate-700">
              Asignación a Orden de Fabricación
            </h2>
          </div>
          <label className="inline-flex items-center gap-2 cursor-pointer select-none mb-4">
            <input
              type="checkbox"
              checked={asignarAOF}
              onChange={(e) => {
                const checked = e.target.checked;
                setAsignarAOF(checked);
                if (checked) {
                  setTimeout(
                    () =>
                      ofCardRef.current?.scrollIntoView({
                        behavior: "smooth",
                        block: "start",
                      }),
                    50,
                  );
                } else {
                  setAsignacionMultiple(false);
                  setOfSeleccionada(null);
                  setOfsSeleccionadas([]);
                  setMontosAsignados({});
                }
              }}
              className="h-4 w-4 rounded border-slate-300 text-slate-700 focus:ring-slate-400 cursor-pointer"
            />
            <span className="text-sm text-slate-700 font-medium">
              Asignar este costo a una Orden de Fabricación
            </span>
          </label>

          {asignarAOF && (
            <div className="flex flex-col gap-4">
              {/* Modo: una sola / varias */}
              <div className="flex items-center gap-6">
                <label className="inline-flex items-center gap-2 cursor-pointer text-sm text-slate-700">
                  <input
                    type="radio"
                    name="modo_asignacion"
                    checked={!asignacionMultiple}
                    onChange={() => {
                      setAsignacionMultiple(false);
                      setOfsSeleccionadas([]);
                      setMontosAsignados({});
                    }}
                    className="h-4 w-4 border-slate-300 text-slate-700 focus:ring-slate-400"
                  />
                  Una sola OF
                </label>
                <label className="inline-flex items-center gap-2 cursor-pointer text-sm text-slate-700">
                  <input
                    type="radio"
                    name="modo_asignacion"
                    checked={asignacionMultiple}
                    onChange={() => {
                      setAsignacionMultiple(true);
                      setOfSeleccionada(null);
                    }}
                    className="h-4 w-4 border-slate-300 text-slate-700 focus:ring-slate-400"
                  />
                  Varias OF
                </label>
              </div>

              {/* Una sola OF */}
              {!asignacionMultiple && (
                <div>
                  <label className={labelCls}>Orden de fabricación</label>
                  <AsyncSelect
                    cacheOptions
                    defaultOptions
                    loadOptions={cargarOFs}
                    value={ofSeleccionada}
                    onChange={(opt) => setOfSeleccionada(opt)}
                    isClearable
                    placeholder="Escribe el nombre del cliente para buscar…"
                    classNamePrefix="react-select"
                    styles={{
                      control: (base) => ({
                        ...base,
                        borderColor: "#e2e8f0",
                        boxShadow: "none",
                        borderRadius: "0.5rem",
                        fontSize: "0.875rem",
                        "&:hover": { borderColor: "#94a3b8" },
                      }),
                    }}
                  />
                  <p className="mt-1 text-xs text-slate-400">
                    Tip: también puedes llegar desde la OF y se prellenará
                    automáticamente.
                  </p>
                </div>
              )}

              {/* Varias OF */}
              {asignacionMultiple && (
                <div className="flex flex-col gap-3">
                  <div>
                    <label className={labelCls}>Órdenes de fabricación</label>
                    <AsyncSelect
                      isMulti
                      cacheOptions
                      defaultOptions
                      loadOptions={cargarOFs}
                      value={ofsSeleccionadas}
                      onChange={(opts) => {
                        setOfsSeleccionadas(opts || []);
                        const allowed = new Set(
                          (opts || []).map((o) => o.value),
                        );
                        setMontosAsignados((prev) =>
                          Object.fromEntries(
                            Object.entries(prev).filter(([k]) =>
                              allowed.has(Number(k)),
                            ),
                          ),
                        );
                      }}
                      placeholder="Escribe el nombre del cliente para buscar…"
                      classNamePrefix="react-select"
                      styles={{
                        control: (base) => ({
                          ...base,
                          borderColor: "#e2e8f0",
                          boxShadow: "none",
                          borderRadius: "0.5rem",
                          fontSize: "0.875rem",
                          "&:hover": { borderColor: "#94a3b8" },
                        }),
                      }}
                    />
                  </div>

                  {/* Auto-distribución por driver */}
                  <div className="flex flex-wrap items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      Auto-distribución
                    </span>
                    <select
                      className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-400 transition"
                      value={driver}
                      onChange={(e) => setDriver(e.target.value)}
                    >
                      <option value="cantidad">Cantidad</option>
                      <option value="avances"># Avances</option>
                      <option value="costo">Costo de fabricación</option>
                    </select>
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          if (!fechaRegistro) {
                            toast.error(
                              "Selecciona primero la fecha del costo.",
                            );
                            return;
                          }
                          const total = valorNumerico;
                          if (!total || total <= 0) {
                            toast.error(
                              "Define el valor total del costo para poder distribuir.",
                            );
                            return;
                          }
                          const d = new Date(fechaRegistro);
                          const resp = await api.get(
                            "/costos-indirectos-asignados/sugerencias",
                            {
                              params: {
                                anio: d.getFullYear(),
                                mes: d.getMonth() + 1,
                                driver,
                                total,
                                estados: "pendiente,en proceso,completada",
                              },
                            },
                          );
                          const sugs = Array.isArray(resp.data)
                            ? resp.data
                            : [];
                          if (sugs.length === 0) {
                            toast(
                              "No hay datos en ese mes para sugerir distribución.",
                            );
                            return;
                          }
                          setSugerencias(sugs);
                          setMostrarDetalle(true);
                          toast.success(
                            "Sugerencias calculadas. Revisa el detalle antes de aplicar.",
                          );
                        } catch (err) {
                          console.error("Error obteniendo sugerencias:", err);
                          toast.error(
                            "No fue posible obtener las sugerencias.",
                          );
                        }
                      }}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-700 text-white transition cursor-pointer"
                    >
                      Calcular sugerencias
                    </button>
                  </div>

                  {/* Tabla de sugerencias */}
                  {mostrarDetalle && sugerencias.length > 0 && (
                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                      <div className="px-4 py-3 bg-slate-50 flex items-center justify-between border-b border-slate-200">
                        <p className="text-xs font-semibold text-slate-700">
                          Distribución sugerida — driver: {driver}
                        </p>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              const nuevasSeleccionadas = sugerencias
                                .filter(
                                  (s) => Number(s.valor_asignado || 0) > 0,
                                )
                                .map((s) => ({
                                  value: s.id_orden_fabricacion,
                                  label: `OF #${s.id_orden_fabricacion}`,
                                }));
                              setOfsSeleccionadas(nuevasSeleccionadas);
                              setMontosAsignados(
                                Object.fromEntries(
                                  sugerencias.map((s) => [
                                    s.id_orden_fabricacion,
                                    Number(s.valor_asignado || 0),
                                  ]),
                                ),
                              );
                              setMostrarDetalle(false);
                              toast.success("Sugerencias aplicadas.");
                            }}
                            className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-700 text-white transition cursor-pointer"
                          >
                            Aplicar sugerencias
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSugerencias([]);
                              setMostrarDetalle(false);
                            }}
                            className="inline-flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                          >
                            Descartar
                          </button>
                        </div>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                          <thead>
                            <tr className="border-b border-slate-100 bg-white">
                              <th className="text-left px-4 py-2 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                                OF
                              </th>
                              <th className="text-right px-4 py-2 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                                Driver
                              </th>
                              <th className="text-right px-4 py-2 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                                %
                              </th>
                              <th className="text-right px-4 py-2 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                                Sugerido
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {sugerencias.map((s) => {
                              const driverVal = Number(s.driver_valor || 0);
                              const peso = Number(s.peso || 0);
                              const sugerido = Number(
                                s.valor_asignado ??
                                  Math.floor(peso * valorNumerico),
                              );
                              const fmtDriver =
                                driver === "costo"
                                  ? formatCOP(driverVal)
                                  : new Intl.NumberFormat("es-CO").format(
                                      driverVal,
                                    );
                              return (
                                <tr key={s.id_orden_fabricacion}>
                                  <td className="px-4 py-2 font-mono text-xs text-slate-500">
                                    OF #{s.id_orden_fabricacion}
                                  </td>
                                  <td className="px-4 py-2 text-right text-xs text-slate-600">
                                    {fmtDriver}
                                  </td>
                                  <td className="px-4 py-2 text-right text-xs text-slate-600">
                                    {(peso * 100).toFixed(2)}%
                                  </td>
                                  <td className="px-4 py-2 text-right text-xs font-semibold text-slate-800">
                                    {formatCOP(sugerido)}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                      <div className="px-4 py-2 bg-slate-50 flex items-center justify-end gap-4 text-xs text-slate-600 border-t border-slate-100">
                        <span>
                          Total sugerido:{" "}
                          <strong>
                            {formatCOP(
                              sugerencias.reduce(
                                (a, s) => a + Number(s.valor_asignado || 0),
                                0,
                              ),
                            )}
                          </strong>
                        </span>
                        <span>
                          Total costo:{" "}
                          <strong>{formatCOP(valorNumerico)}</strong>
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Montos por OF */}
                  {ofsSeleccionadas.length > 0 && !mostrarDetalle && (
                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                      <div className="divide-y divide-slate-100">
                        {ofsSeleccionadas.map((opt) => {
                          const id = opt.value;
                          const val = montosAsignados[id] || 0;
                          return (
                            <div
                              key={id}
                              className="flex items-center justify-between gap-4 px-4 py-3"
                            >
                              <span className="text-sm text-slate-700">
                                {opt.label}
                              </span>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-slate-400">
                                  Valor
                                </span>
                                <input
                                  type="text"
                                  value={val ? formatCOP(val) : ""}
                                  onChange={(e) => {
                                    const num = cleanCOP(e.target.value);
                                    setMontosAsignados((prev) => ({
                                      ...prev,
                                      [id]: num,
                                    }));
                                  }}
                                  placeholder="$ 0"
                                  inputMode="numeric"
                                  className="w-40 border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 transition"
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <div className="flex items-center justify-end px-4 py-2.5 bg-slate-50 border-t border-slate-100 text-sm">
                        <span className="text-slate-500 mr-2">Asignado:</span>
                        <strong className="text-slate-900">
                          {formatCOP(
                            Object.values(montosAsignados).reduce(
                              (a, b) => a + (Number(b) || 0),
                              0,
                            ),
                          )}
                        </strong>
                        <span className="text-slate-400 mx-2">/</span>
                        <span className="text-slate-700">
                          {formatCOP(valorNumerico)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Botones */}
        <div className="sticky bottom-0 z-10 flex items-center justify-end gap-3 py-3 px-1 bg-slate-50 border-t border-slate-200">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 shadow-sm transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 text-sm font-semibold px-5 py-2 rounded-lg bg-slate-900 hover:bg-slate-700 text-white shadow-sm transition-colors cursor-pointer"
          >
            Registrar costo
          </button>
        </div>
      </form>
    </div>
  );
};

export default CostosIndirectosNuevo;
