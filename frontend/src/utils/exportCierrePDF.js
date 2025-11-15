import jsPDF from "jspdf";
import "jspdf-autotable";

export const exportarCierrePDF = (cierre, movimientos) => {
  const doc = new jsPDF();

  // Título
  doc.setFontSize(18);
  doc.setFont(undefined, "bold");
  doc.text("CIERRE DE CAJA", 105, 15, { align: "center" });

  // Información del período
  doc.setFontSize(11);
  doc.setFont(undefined, "normal");
  const fechaInicio = formatFecha(cierre.fecha_inicio);
  const fechaFin = cierre.fecha_fin ? formatFecha(cierre.fecha_fin) : "Actual";
  doc.text(`Período: ${fechaInicio} - ${fechaFin}`, 14, 25);
  doc.text(
    `Estado: ${cierre.estado === "abierto" ? "ABIERTO" : "CERRADO"}`,
    14,
    31
  );
  doc.text(`Cierre #${cierre.id_cierre}`, 14, 37);

  // Calcular totales
  const totalInicial = cierre.detalle_metodos.reduce(
    (sum, d) => sum + (d.saldo_inicial || 0),
    0
  );
  const totalIngresos = cierre.detalle_metodos.reduce(
    (sum, d) => sum + (d.total_ingresos || 0),
    0
  );
  const totalEgresos = cierre.detalle_metodos.reduce(
    (sum, d) => sum + (d.total_egresos || 0),
    0
  );
  const totalFinal = cierre.detalle_metodos.reduce(
    (sum, d) => sum + (d.saldo_final || 0),
    0
  );

  // Resumen Ejecutivo
  doc.setFont(undefined, "bold");
  doc.setFontSize(12);
  doc.text("RESUMEN EJECUTIVO", 14, 47);

  doc.autoTable({
    startY: 50,
    head: [["Concepto", "Monto"]],
    body: [
      ["Saldo Inicial", formatMonto(totalInicial)],
      ["Total Ingresos", formatMonto(totalIngresos)],
      ["Total Egresos", formatMonto(totalEgresos)],
      ["Saldo Final", formatMonto(totalFinal)],
    ],
    theme: "grid",
    headStyles: {
      fillColor: [59, 130, 246],
      textColor: 255,
      fontStyle: "bold",
    },
    styles: { fontSize: 10 },
    columnStyles: {
      0: { cellWidth: 100 },
      1: { cellWidth: 70, halign: "right", fontStyle: "bold" },
    },
  });

  // Tabla de Saldos por Método de Pago
  let finalY = doc.lastAutoTable.finalY + 10;

  doc.setFont(undefined, "bold");
  doc.text("SALDOS POR MÉTODO DE PAGO", 14, finalY);

  const metodosData = cierre.detalle_metodos.map((d) => [
    d.metodo_nombre,
    formatMonto(d.saldo_inicial),
    formatMonto(d.total_ingresos),
    formatMonto(d.total_egresos),
    formatMonto(d.saldo_final),
  ]);

  doc.autoTable({
    startY: finalY + 3,
    head: [["Método", "Saldo Inicial", "Ingresos", "Egresos", "Saldo Final"]],
    body: metodosData,
    theme: "striped",
    headStyles: {
      fillColor: [107, 114, 128],
      textColor: 255,
      fontStyle: "bold",
    },
    styles: { fontSize: 9 },
    columnStyles: {
      0: { cellWidth: 50 },
      1: { cellWidth: 30, halign: "right" },
      2: { cellWidth: 30, halign: "right" },
      3: { cellWidth: 30, halign: "right" },
      4: { cellWidth: 30, halign: "right", fontStyle: "bold" },
    },
  });

  // Movimientos detallados (si hay)
  if (movimientos && movimientos.length > 0) {
    finalY = doc.lastAutoTable.finalY + 10;

    // Nueva página si no hay espacio
    if (finalY > 250) {
      doc.addPage();
      finalY = 15;
    }

    doc.setFont(undefined, "bold");
    doc.text("DETALLE DE MOVIMIENTOS", 14, finalY);

    const movimientosData = movimientos
      .slice(0, 50)
      .map((m) => [
        formatFecha(m.fecha),
        m.tipo_movimiento === "ingreso" ? "Ingreso" : "Egreso",
        `${m.tipo_documento} #${m.id_documento}`,
        m.metodo_pago,
        formatMonto(Math.abs(m.monto)),
      ]);

    doc.autoTable({
      startY: finalY + 3,
      head: [["Fecha", "Tipo", "Documento", "Método", "Monto"]],
      body: movimientosData,
      theme: "grid",
      headStyles: {
        fillColor: [75, 85, 99],
        textColor: 255,
        fontStyle: "bold",
      },
      styles: { fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 25 },
        1: { cellWidth: 20 },
        2: { cellWidth: 50 },
        3: { cellWidth: 35 },
        4: { cellWidth: 30, halign: "right" },
      },
    });

    if (movimientos.length > 50) {
      doc.setFontSize(8);
      doc.setFont(undefined, "italic");
      doc.text(
        `Mostrando los primeros 50 de ${movimientos.length} movimientos`,
        14,
        doc.lastAutoTable.finalY + 5
      );
    }
  }

  // Footer
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont(undefined, "normal");
    const fecha = new Date().toLocaleString("es-CO");
    doc.text(`Generado: ${fecha}`, 14, 285);
    doc.text(`Página ${i} de ${pageCount}`, 180, 285);
  }

  // Guardar
  const nombreArchivo = `Cierre_${cierre.id_cierre}_${fechaInicio.replace(
    /\//g,
    "-"
  )}.pdf`;
  doc.save(nombreArchivo);
};

// Funciones auxiliares
const formatMonto = (monto) => {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
  }).format(monto || 0);
};

const formatFecha = (fecha) => {
  if (!fecha) return "-";
  const [year, month, day] = fecha.split("T")[0].split("-");
  return new Date(year, month - 1, day).toLocaleDateString("es-CO");
};
