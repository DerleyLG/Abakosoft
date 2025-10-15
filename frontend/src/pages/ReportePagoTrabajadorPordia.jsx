import React, { useEffect, useMemo, useState } from 'react';
import ReporteBase from '../components/ReporteBase';
import api from '../services/api';
import { FiX } from 'react-icons/fi';
import { formatInTimeZone } from 'date-fns-tz';

const ReportePagoTrabajadorPorDia = () => {
	const titulo = 'Pagos a Trabajadores por Día';

	// Estado para trabajadores y búsqueda
	const [trabajadores, setTrabajadores] = useState([]); // { value: id, label: nombre }
	const [query, setQuery] = useState('');
		const [seleccion, setSeleccion] = useState(null); // { value, label } o null
		const [showSugerencias, setShowSugerencias] = useState(false);

	useEffect(() => {
		const cargarTrabajadores = async () => {
			try {
				const res = await api.get('/trabajadores');
				const data = Array.isArray(res.data) ? res.data : [];
				setTrabajadores(
					data.map((t) => ({ value: t.id_trabajador, label: t.nombre }))
				);
			} catch (e) {
				// Silencioso; ReporteBase ya maneja toasts para el fetch del reporte
				console.error('No se pudo cargar trabajadores', e);
			}
		};
		cargarTrabajadores();
	}, []);

	const sugerencias = useMemo(() => {
		const q = query.trim().toLowerCase();
		if (!q) return trabajadores.slice(0, 8);
		return trabajadores
			.filter((t) => t.label?.toLowerCase().includes(q))
			.slice(0, 8);
	}, [query, trabajadores]);

		// Solo registros de hoy (en zona horaria local del negocio)
		const timezone = 'America/Bogota';
		const today = useMemo(() => formatInTimeZone(new Date(), timezone, 'yyyy-MM-dd'), []);

	// Componer endpoint con filtros fijos (hoy) y condicional (trabajador)
		const endpoint = useMemo(() => {
			const params = new URLSearchParams({ desde: today, hasta: today });
			if (seleccion?.value) params.append('id_trabajador', String(seleccion.value));
			return `/reportes/pagos-trabajadores-dia?${params.toString()}`;
		}, [seleccion, today]);

	const columnas = [
		{ header: 'Fecha', accessor: 'fecha' },
		{ header: 'ID Trabajador', accessor: 'id_trabajador' },
		{ header: 'Trabajador', accessor: 'trabajador' },
		{ header: 'Total Bruto', accessor: 'total_bruto', isCurrency: true },
		{ header: 'Total Descuentos', accessor: 'total_descuentos', isCurrency: true },
		{ header: 'Total Neto', accessor: 'total_neto', isCurrency: true },
	];

		// No usamos filtros integrados de ReporteBase, manejamos nuestro selector personalizado
	const filtros = [];

		// Totales dinámicos según datos actuales
		const [totales, setTotales] = useState({ bruto: 0, descuentos: 0, neto: 0 });
		const formatCOP = (n) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Number(n) || 0);

		return (
			<div className="p-6">
				{/* Filtros */}
				<div className="mb-4 flex flex-col gap-2 max-w-full">
						<label className="text-sm text-slate-600">Trabajador</label>
					<div className="w-full md:max-w-2xl">
						<div className="flex gap-2 items-center w-full">
								<input
									type="text"
									placeholder="Escribe el nombre y selecciona..."
								className="border border-slate-300 rounded-md px-3 py-2 text-sm w-full"
									value={query}
									onChange={(e) => {
										setQuery(e.target.value);
										setSeleccion(null);
										setShowSugerencias(true);
									}}
									onFocus={() => setShowSugerencias(true)}
									onKeyDown={(e) => {
										if (e.key === 'Escape') {
											setShowSugerencias(false);
											e.currentTarget.blur();
										}
										if (e.key === 'Enter') {
											if (sugerencias.length > 0) {
												const opt = sugerencias[0];
												setSeleccion(opt);
												setQuery(opt.label);
												setShowSugerencias(false);
												e.preventDefault();
											}
										}
									}}
								/>
								<button
									type="button"
									className="h-9 px-3 border border-slate-300 rounded-md cursor-pointer text-slate-600 hover:bg-slate-100"
									onClick={() => { setQuery(''); setSeleccion(null); setShowSugerencias(false); }}
									title="Limpiar"
								>
									<FiX />
								</button>
							</div>
										{showSugerencias && sugerencias.length > 0 && (
											<div className="mt-2 border border-slate-200 rounded-md bg-white w-full">
									<ul className="max-h-56 overflow-auto divide-y divide-slate-100">
										{sugerencias.map((opt) => (
											<li
												key={opt.value}
												className="px-3 py-2 text-sm hover:bg-slate-50 cursor-pointer"
												onMouseDown={() => {
													setSeleccion(opt);
													setQuery(opt.label);
													setShowSugerencias(false);
												}}
											>
												{opt.label}
											</li>
										))}
									</ul>
								</div>
							)}
							{seleccion && (
								<div className="mt-1 text-xs text-slate-600">
									Seleccionado: {seleccion.label} (ID {seleccion.value})
									<button
										type="button"
										className="ml-2 text-slate-500 hover:text-slate-700 underline cursor-pointer"
										onClick={() => { setSeleccion(null); setQuery(''); setShowSugerencias(false); }}
									>
										Quitar
									</button>
								</div>
							)}
							<div className="mt-2 text-xs text-slate-500">
								Mostrando solo pagos de hoy ({today}). Sin seleccionar trabajador, verás todos los pagos del día.
							</div>
						</div>
					</div>

							{/* Resumen de totales con tonos suaves consistentes */}
							<div className="mb-4">
								<div className="rounded-xl p-5 bg-slate-50 border border-slate-200 text-slate-800 shadow-sm flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
									<div className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">
										Total pagado hoy: {formatCOP(totales.neto)}
									</div>
									<div className="flex flex-wrap gap-x-8 gap-y-2 text-sm">
										<div><span className="font-medium text-slate-600">Bruto:</span> <span className="font-semibold text-slate-900">{formatCOP(totales.bruto)}</span></div>
										<div><span className="font-medium text-slate-600">Descuentos:</span> <span className="font-semibold text-slate-900">{formatCOP(totales.descuentos)}</span></div>
										<div><span className="font-medium text-slate-600">Neto:</span> <span className="font-semibold text-slate-900">{formatCOP(totales.neto)}</span></div>
									</div>
								</div>
							</div>


					<ReporteBase
						titulo={titulo}
						endpoint={endpoint}
						filtros={filtros}
						columnas={columnas}
								containerClassName="p-0"
								exportSummary={[
									{ label: `Total pagado hoy (${today})`, value: totales.neto, isCurrency: true },
									{ label: 'Bruto', value: totales.bruto, isCurrency: true },
									{ label: 'Descuentos', value: totales.descuentos, isCurrency: true },
								]}
						onDataChange={(rows) => {
							const bruto = rows.reduce((acc, r) => acc + (Number(r.total_bruto) || 0), 0);
							const descuentos = rows.reduce((acc, r) => acc + (Number(r.total_descuentos) || 0), 0);
							const neto = rows.reduce((acc, r) => acc + (Number(r.total_neto) || 0), 0);
							setTotales({ bruto, descuentos, neto });
						}}
					/>
		</div>
	);
};

export default ReportePagoTrabajadorPorDia;
