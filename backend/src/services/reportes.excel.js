// backend/src/services/reportes.excel.js
import ExcelJS from "exceljs";
import { paredComoUtc } from "../utils/tz.js";

const AZUL = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FF1A237E" },
};
const MONEDA = "#,##0";
const cabecera = (ws) =>
  ws.getRow(1).eachCell((c) => {
    c.fill = AZUL;
    c.font = { bold: true, color: { argb: "FFFFFFFF" } };
  });
const pared = (tz, v) => (v ? paredComoUtc(tz, new Date(v)) : null); // Excel no tiene zonas: se escribe la hora local

export function libroReporte({
  empresa,
  tz,
  desde,
  hasta,
  resumen,
  movimientos,
  mensualidades,
}) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "ParkSystem";
  const k = resumen.kpis;

  const r = wb.addWorksheet("Resumen");
  r.columns = [{ width: 32 }, { width: 24 }];
  r.addRow(["Reporte de Movimientos - ParkSystem", empresa.nombre]).font = {
    bold: true,
    size: 14,
  };
  [
    ["Rango", `${desde} a ${hasta}`],
    ["Moneda", empresa.moneda],
    ["Ingresos (total)", k.ingresos],
    ["Ingresos parqueo", k.ingresosMov],
    ["Ingresos mensualidades", k.ingresosMens],
    ["Tickets", k.tickets],
    ["Promedio ticket (parqueo)", k.promedioTicket],
    ["Vehículos dentro", k.activos],
  ].forEach(([a, b]) => r.addRow([a, b]));
  [3, 4, 5, 7].forEach((n) => (r.getCell(`B${n + 1}`).numFmt = MONEDA));
  r.addRow([]);
  r.addRow(["Ingresos por método"]).font = { bold: true };
  resumen.porMetodo.forEach((m) => {
    const row = r.addRow([m.metodo_pago, m.total]);
    row.getCell(2).numFmt = MONEDA;
  });

  const ws = wb.addWorksheet("Movimientos", {
    views: [{ state: "frozen", ySplit: 1 }],
  });
  ws.columns = [
    { header: "#Mov", key: "id", width: 10 },
    { header: "Placa", key: "placa", width: 12 },
    { header: "Tipo", key: "tipo", width: 14 },
    { header: "Entrada", key: "ent", width: 20 },
    { header: "Salida", key: "sal", width: 20 },
    { header: "Estado", key: "estado", width: 12 },
    { header: "Total", key: "total", width: 16 },
    { header: "Efectivo", key: "ef", width: 14 },
    { header: "Tarjeta", key: "ta", width: 14 },
    { header: "QR", key: "qr", width: 14 },
  ];
  movimientos.forEach((m) =>
    ws.addRow({
      id: m.id_movimiento,
      placa: m.placa,
      tipo: m.tipo,
      ent: pared(tz, m.fecha_entrada),
      sal: pared(tz, m.fecha_salida),
      estado: String(m.estado).toUpperCase(),
      total: m.total_a_pagar,
      ef: m.efectivo,
      ta: m.tarjeta,
      qr: m.qr,
    }),
  );
  ["ent", "sal"].forEach((c) => (ws.getColumn(c).numFmt = "dd/mm/yyyy hh:mm"));
  ["total", "ef", "ta", "qr"].forEach((c) => (ws.getColumn(c).numFmt = MONEDA));
  cabecera(ws);
  ws.autoFilter = { from: "A1", to: "J1" };
  const fin = ws.rowCount + 1;
  ws.getCell(`F${fin}`).value = "Total";
  ws.getCell(`G${fin}`).value = { formula: `SUM(G2:G${fin - 1})` };
  ws.getCell(`G${fin}`).numFmt = MONEDA;

  const wm = wb.addWorksheet("Mensualidades", {
    views: [{ state: "frozen", ySplit: 1 }],
  });
  wm.columns = [
    { header: "Fecha", key: "f", width: 20 },
    { header: "Método", key: "m", width: 14 },
    { header: "Monto", key: "monto", width: 16 },
    { header: "Placa", key: "p", width: 12 },
    { header: "#Mensualidad", key: "id", width: 14 },
    { header: "Titular", key: "t", width: 26 },
    { header: "Periodo desde", key: "d", width: 14 },
    { header: "Periodo hasta", key: "h", width: 14 },
  ];
  mensualidades.forEach((x) =>
    wm.addRow({
      f: pared(tz, x.fecha_pago),
      m: x.metodo_pago,
      monto: x.monto,
      p: x.placa,
      id: x.id_mensualidad,
      t: x.titular_nombre,
      d: x.periodo_desde,
      h: x.periodo_hasta,
    }),
  );
  wm.getColumn("f").numFmt = "dd/mm/yyyy hh:mm";
  wm.getColumn("monto").numFmt = MONEDA;
  cabecera(wm);
  return wb;
}

export function libroTurnos({ tz, turnos }) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Cierres de turno");
  ws.columns = [
    { header: "#", key: "i", width: 6 },
    { header: "Apertura", key: "a", width: 20 },
    { header: "Cierre", key: "c", width: 20 },
    { header: "Usuario", key: "u", width: 24 },
    { header: "Base", key: "b", width: 14 },
    { header: "Efectivo", key: "e", width: 14 },
    { header: "Tarjeta", key: "t", width: 14 },
    { header: "QR", key: "q", width: 14 },
    { header: "Total", key: "g", width: 14 },
    { header: "Diferencia", key: "d", width: 14 },
  ];
  turnos.forEach((t) =>
    ws.addRow({
      i: t.id_turno,
      a: pared(tz, t.fecha_apertura),
      c: pared(tz, t.fecha_cierre),
      u: t.usuario,
      b: t.base_inicial,
      e: t.total_efectivo,
      t: t.total_tarjeta,
      q: t.total_qr,
      g: t.total_general,
      d: t.diferencia,
    }),
  );
  ["a", "c"].forEach((c) => (ws.getColumn(c).numFmt = "dd/mm/yyyy hh:mm"));
  ["b", "e", "t", "q", "g", "d"].forEach(
    (c) => (ws.getColumn(c).numFmt = MONEDA),
  );
  cabecera(ws);
  return wb;
}
