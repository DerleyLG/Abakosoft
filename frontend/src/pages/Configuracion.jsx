import { useState, useEffect } from "react";
import {
  FiEdit2,
  FiTrash2,
  FiPlus,
  FiCheck,
  FiX,
  FiSettings,
} from "react-icons/fi";
import api from "../services/api";
import toast from "react-hot-toast";

// ─── Fila editable inline ─────────────────────────────────────────────────────
const EditableRow = ({ children, onSave, onCancel }) => (
  <tr className="bg-blue-50">
    {children}
    <td className="px-4 py-2 text-right">
      <div className="flex items-center justify-end gap-1">
        <button
          onClick={onSave}
          className="p-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition cursor-pointer"
          title="Guardar"
        >
          <FiCheck size={13} />
        </button>
        <button
          onClick={onCancel}
          className="p-1.5 rounded-lg bg-slate-200 text-slate-600 hover:bg-slate-300 transition cursor-pointer"
          title="Cancelar"
        >
          <FiX size={13} />
        </button>
      </div>
    </td>
  </tr>
);

// ─── Métodos de Pago ─────────────────────────────────────────────────────────
const MetodosPagoTab = () => {
  const [metodos, setMetodos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editNombre, setEditNombre] = useState("");
  const [editTipo, setEditTipo] = useState("contado");
  const [newNombre, setNewNombre] = useState("");
  const [newTipo, setNewTipo] = useState("contado");
  const [showNew, setShowNew] = useState(false);

  const load = () => {
    setLoading(true);
    api
      .get("/metodos-pago")
      .then((r) => setMetodos(Array.isArray(r.data) ? r.data : []))
      .catch(() => toast.error("Error al cargar métodos de pago"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const handleEdit = (m) => {
    setEditingId(m.id_metodo_pago);
    setEditNombre(m.nombre);
    setEditTipo(m.tipo || "contado");
    setShowNew(false);
  };

  const handleSaveEdit = async () => {
    if (!editNombre.trim()) return toast.error("El nombre es obligatorio");
    try {
      await api.put(`/metodos-pago/${editingId}`, {
        nombre: editNombre.trim(),
        tipo: editTipo,
      });
      toast.success("Actualizado");
      setEditingId(null);
      load();
    } catch {
      toast.error("Error al actualizar");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("¿Eliminar este método de pago?")) return;
    try {
      await api.delete(`/metodos-pago/${id}`);
      toast.success("Eliminado");
      load();
    } catch (e) {
      toast.error(e?.response?.data?.error || "Error al eliminar");
    }
  };

  const handleCreate = async () => {
    if (!newNombre.trim()) return toast.error("El nombre es obligatorio");
    try {
      await api.post("/metodos-pago", {
        nombre: newNombre.trim(),
        tipo: newTipo,
      });
      toast.success("Creado");
      setNewNombre("");
      setNewTipo("contado");
      setShowNew(false);
      load();
    } catch {
      toast.error("Error al crear");
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-slate-500">
          Configura los métodos de pago disponibles para ventas y cierres de
          caja.
        </p>
        <button
          onClick={() => {
            setShowNew(true);
            setEditingId(null);
            setNewNombre("");
          }}
          className="flex items-center gap-1.5 text-sm font-semibold bg-slate-800 text-white px-3 py-2 rounded-lg hover:bg-slate-700 transition cursor-pointer"
        >
          <FiPlus size={14} /> Nuevo
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-slate-400 py-6 text-center">Cargando...</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="text-left px-4 py-2 text-slate-500 font-semibold">
                Nombre
              </th>
              <th className="text-left px-4 py-2 text-slate-500 font-semibold">
                Tipo
              </th>
              <th className="w-24" />
            </tr>
          </thead>
          <tbody>
            {showNew && (
              <EditableRow
                onSave={handleCreate}
                onCancel={() => setShowNew(false)}
              >
                <td className="px-4 py-2">
                  <input
                    autoFocus
                    value={newNombre}
                    onChange={(e) => setNewNombre(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                    className="w-full border border-blue-300 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-300"
                    placeholder="Ej: Nequi, Daviplata..."
                  />
                </td>
                <td className="px-4 py-2">
                  <select
                    value={newTipo}
                    onChange={(e) => setNewTipo(e.target.value)}
                    className="border border-blue-300 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-300"
                  >
                    <option value="contado">Contado</option>
                    <option value="credito">Crédito</option>
                  </select>
                </td>
              </EditableRow>
            )}
            {metodos.map((m) =>
              editingId === m.id_metodo_pago ? (
                <EditableRow
                  key={m.id_metodo_pago}
                  onSave={handleSaveEdit}
                  onCancel={() => setEditingId(null)}
                >
                  <td className="px-4 py-2">
                    <input
                      autoFocus
                      value={editNombre}
                      onChange={(e) => setEditNombre(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSaveEdit()}
                      className="w-full border border-blue-300 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-300"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <select
                      value={editTipo}
                      onChange={(e) => setEditTipo(e.target.value)}
                      className="border border-blue-300 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-300"
                    >
                      <option value="contado">Contado</option>
                      <option value="credito">Crédito</option>
                    </select>
                  </td>
                </EditableRow>
              ) : (
                <tr
                  key={m.id_metodo_pago}
                  className="border-b border-slate-100 hover:bg-slate-50"
                >
                  <td className="px-4 py-3 text-slate-800 font-medium">
                    {m.nombre}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                        m.tipo === "credito"
                          ? "bg-amber-50 text-amber-700 border border-amber-200"
                          : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      }`}
                    >
                      {m.tipo === "credito" ? "Crédito" : "Contado"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => handleEdit(m)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition cursor-pointer"
                        title="Editar"
                      >
                        <FiEdit2 size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(m.id_metodo_pago)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition cursor-pointer"
                        title="Eliminar"
                      >
                        <FiTrash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ),
            )}
            {metodos.length === 0 && !showNew && (
              <tr>
                <td
                  colSpan={3}
                  className="text-center py-8 text-slate-400 text-sm"
                >
                  No hay métodos de pago configurados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
};

// ─── Unidades de Medida ───────────────────────────────────────────────────────
const UnidadesTab = () => {
  const [unidades, setUnidades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editNombre, setEditNombre] = useState("");
  const [editAbrev, setEditAbrev] = useState("");
  const [newNombre, setNewNombre] = useState("");
  const [newAbrev, setNewAbrev] = useState("");
  const [showNew, setShowNew] = useState(false);

  const load = () => {
    setLoading(true);
    api
      .get("/unidades")
      .then((r) => setUnidades(Array.isArray(r.data) ? r.data : []))
      .catch(() => toast.error("Error al cargar unidades"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const handleEdit = (u) => {
    setEditingId(u.id_unidad);
    setEditNombre(u.nombre);
    setEditAbrev(u.abreviatura);
    setShowNew(false);
  };

  const handleSaveEdit = async () => {
    if (!editNombre.trim() || !editAbrev.trim())
      return toast.error("Nombre y abreviatura son obligatorios");
    try {
      await api.put(`/unidades/${editingId}`, {
        nombre: editNombre.trim(),
        abreviatura: editAbrev.trim(),
      });
      toast.success("Actualizado");
      setEditingId(null);
      load();
    } catch {
      toast.error("Error al actualizar");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("¿Eliminar esta unidad de medida?")) return;
    try {
      await api.delete(`/unidades/${id}`);
      toast.success("Eliminado");
      load();
    } catch (e) {
      toast.error(e?.response?.data?.error || "Error al eliminar");
    }
  };

  const handleCreate = async () => {
    if (!newNombre.trim() || !newAbrev.trim())
      return toast.error("Nombre y abreviatura son obligatorios");
    try {
      await api.post("/unidades", {
        nombre: newNombre.trim(),
        abreviatura: newAbrev.trim(),
      });
      toast.success("Creado");
      setNewNombre("");
      setNewAbrev("");
      setShowNew(false);
      load();
    } catch {
      toast.error("Error al crear");
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-slate-500">
          Define las unidades de medida disponibles para artículos e inventario.
        </p>
        <button
          onClick={() => {
            setShowNew(true);
            setEditingId(null);
            setNewNombre("");
            setNewAbrev("");
          }}
          className="flex items-center gap-1.5 text-sm font-semibold bg-slate-800 text-white px-3 py-2 rounded-lg hover:bg-slate-700 transition cursor-pointer"
        >
          <FiPlus size={14} /> Nueva
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-slate-400 py-6 text-center">Cargando...</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="text-left px-4 py-2 text-slate-500 font-semibold">
                Nombre
              </th>
              <th className="text-left px-4 py-2 text-slate-500 font-semibold">
                Abreviatura
              </th>
              <th className="w-24" />
            </tr>
          </thead>
          <tbody>
            {showNew && (
              <EditableRow
                onSave={handleCreate}
                onCancel={() => setShowNew(false)}
              >
                <td className="px-4 py-2">
                  <input
                    autoFocus
                    value={newNombre}
                    onChange={(e) => setNewNombre(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                    className="w-full border border-blue-300 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-300"
                    placeholder="Ej: Kilogramo"
                  />
                </td>
                <td className="px-4 py-2">
                  <input
                    value={newAbrev}
                    onChange={(e) => setNewAbrev(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                    className="w-full border border-blue-300 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-300"
                    placeholder="Ej: kg"
                  />
                </td>
              </EditableRow>
            )}
            {unidades.map((u) =>
              editingId === u.id_unidad ? (
                <EditableRow
                  key={u.id_unidad}
                  onSave={handleSaveEdit}
                  onCancel={() => setEditingId(null)}
                >
                  <td className="px-4 py-2">
                    <input
                      autoFocus
                      value={editNombre}
                      onChange={(e) => setEditNombre(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSaveEdit()}
                      className="w-full border border-blue-300 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-300"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      value={editAbrev}
                      onChange={(e) => setEditAbrev(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSaveEdit()}
                      className="w-full border border-blue-300 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-300"
                    />
                  </td>
                </EditableRow>
              ) : (
                <tr
                  key={u.id_unidad}
                  className="border-b border-slate-100 hover:bg-slate-50"
                >
                  <td className="px-4 py-3 text-slate-800 font-medium">
                    {u.nombre}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{u.abreviatura}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => handleEdit(u)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition cursor-pointer"
                        title="Editar"
                      >
                        <FiEdit2 size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(u.id_unidad)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition cursor-pointer"
                        title="Eliminar"
                      >
                        <FiTrash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ),
            )}
            {unidades.length === 0 && !showNew && (
              <tr>
                <td
                  colSpan={3}
                  className="text-center py-8 text-slate-400 text-sm"
                >
                  No hay unidades configuradas.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
};

// ─── Página principal ─────────────────────────────────────────────────────────
const TABS = [
  { id: "metodos", label: "Métodos de Pago" },
  { id: "unidades", label: "Unidades de Medida" },
];

const Configuracion = () => {
  const [tab, setTab] = useState("metodos");

  return (
    <div className="min-h-[calc(100vh-68px)] bg-slate-50 px-4 md:px-8 xl:px-12 py-6 flex flex-col gap-5">
      {/* ─── Encabezado ─── */}
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-2xl bg-slate-900 flex items-center justify-center shadow-sm">
          <FiSettings size={22} className="text-white" />
        </div>
        <div>
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Administración de
          </p>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight -mt-0.5">
            Configuración
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Administra los catálogos base del sistema.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-semibold rounded-t-lg transition cursor-pointer ${
              tab === t.id
                ? "text-slate-900 border-b-2 border-slate-800 bg-white"
                : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Contenido */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        {tab === "metodos" ? <MetodosPagoTab /> : <UnidadesTab />}
      </div>
    </div>
  );
};

export default Configuracion;
