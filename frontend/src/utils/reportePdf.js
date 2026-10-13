// frontend/src/utils/reportePdf.js
export async function generarPdf({ empresa, filtros, rows, resumen, fmt }) {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const AZUL = [26, 35, 126];
  const k = resumen.kpis;

  doc.setFillColor(...AZUL);
  doc.rect(0, 0, W, 60, "F");
  doc.setTextColor(255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("Reporte de Movimientos - ParkSystem", 24, 38);
  doc.setFontSize(10);
  doc.text(`Empresa: ${empresa?.nombre ?? ""}`, W - 280, 24);
  doc.text(`Generado: ${fmt.fmtDate(new Date().toISOString())}`, W - 280, 40);

  doc.setTextColor(0);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  const sub = [
    `Rango: ${filtros.desde} a ${filtros.hasta}`,
    filtros.tipo && `Tipo: ${filtros.tipo}`,
    filtros.estado && `Estado: ${filtros.estado}`,
    filtros.placa && `Placa: ${filtros.placa.toUpperCase()}`,
  ]
    .filter(Boolean)
    .join("  |  ");
  doc.text(sub, 24, 80);

  const estilo = {
    styles: { fontSize: 10, cellPadding: 6 },
    headStyles: { fillColor: AZUL, textColor: 255, fontStyle: "bold" },
  };
  autoTable(doc, {
    ...estilo,
    startY: 95,
    head: [["Indicador", "Valor"]],
    tableWidth: 360,
    body: [
      ["Ingresos totales", fmt.fmtMoney(k.ingresos)],
      ["Parqueo", fmt.fmtMoney(k.ingresosMov)],
      ["Mensualidades", fmt.fmtMoney(k.ingresosMens)],
      ["Tickets", String(k.tickets)],
      ["Promedio ticket", fmt.fmtMoney(k.promedioTicket)],
    ],
  });
  const m = Object.fromEntries(
    resumen.porMetodo.map((x) => [x.metodo_pago, x.total]),
  );
  autoTable(doc, {
    ...estilo,
    startY: doc.lastAutoTable.finalY + 10,
    tableWidth: 360,
    head: [["Efectivo", "Tarjeta", "QR", "Transferencia"]],
    styles: { ...estilo.styles, halign: "right" },
    body: [
      [
        fmt.fmtMoney(m.efectivo ?? 0),
        fmt.fmtMoney(m.tarjeta ?? 0),
        fmt.fmtMoney(m.QR ?? 0),
        fmt.fmtMoney(m.transferencia ?? 0),
      ],
    ],
  });

  autoTable(doc, {
    ...estilo,
    startY: doc.lastAutoTable.finalY + 14,
    styles: { fontSize: 9, cellPadding: 5 },
    alternateRowStyles: { fillColor: [245, 247, 255] },
    head: [
      [
        "#Mov",
        "Placa",
        "Tipo",
        "Entrada",
        "Salida",
        "Estado",
        "Total",
        "Efectivo",
        "Tarjeta",
        "QR",
      ],
    ],
    body: rows.map((r) => [
      r.id_movimiento,
      r.placa,
      r.tipo,
      fmt.fmtDate(r.fecha_entrada),
      r.fecha_salida ? fmt.fmtDate(r.fecha_salida) : "-",
      String(r.estado).toUpperCase(),
      r.total_a_pagar != null ? fmt.fmtMoney(r.total_a_pagar) : "-",
      fmt.fmtMoney(r.efectivo),
      fmt.fmtMoney(r.tarjeta),
      fmt.fmtMoney(r.qr),
    ]),
    columnStyles: {
      6: { halign: "right" },
      7: { halign: "right" },
      8: { halign: "right" },
      9: { halign: "right" },
    },
    didDrawPage: () => {
      doc.setFontSize(9);
      doc.setTextColor(140);
      doc.text(
        `Página ${doc.internal.getNumberOfPages()}`,
        W - 80,
        doc.internal.pageSize.getHeight() - 12,
      );
    },
  });
  doc.setFontSize(11);
  doc.setTextColor(0);
  doc.setFont("helvetica", "bold");
  doc.text(
    `Movimientos: ${rows.length}   |   Total facturado: ${fmt.fmtMoney(rows.reduce((a, r) => a + Number(r.total_a_pagar || 0), 0))}`,
    24,
    doc.lastAutoTable.finalY + 24,
  );
  doc.save(`reporte_movimientos_${filtros.desde}_${filtros.hasta}.pdf`);
}
