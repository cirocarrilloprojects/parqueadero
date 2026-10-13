// backend/src/services/mensualidad.rules.js
const parse = (ymd) => {
  const [y, m, d] = ymd.split("-").map(Number);
  return { y, m, d };
};
const aDate = (ymd) => {
  const { y, m, d } = parse(ymd);
  return new Date(Date.UTC(y, m - 1, d));
};
const aYmd = (dt) => dt.toISOString().slice(0, 10);

export function addDays(ymd, n) {
  const dt = aDate(ymd);
  dt.setUTCDate(dt.getUTCDate() + n);
  return aYmd(dt);
}
export function addMonths(ymd, n) {
  const { y, m, d } = parse(ymd);
  const total = y * 12 + (m - 1) + n;
  const ny = Math.floor(total / 12),
    nm = total % 12;
  const ultimo = new Date(Date.UTC(ny, nm + 1, 0)).getUTCDate();
  return aYmd(new Date(Date.UTC(ny, nm, Math.min(d, ultimo))));
}
export const diasEntre = (a, b) =>
  Math.round((aDate(b) - aDate(a)) / 86_400_000);

// Misma regla del original: meses transcurridos entre el inicio del periodo y hoy.
export function mesesVencidos(hoy, inicio) {
  const h = parse(hoy),
    i = parse(inicio);
  let m = (h.y - i.y) * 12 + (h.m - i.m);
  if (h.d >= i.d) m += 1;
  return Math.max(1, m);
}

// m: { estado, fecha_inicio, fecha_fin, last_paid_until } (fechas "YYYY-MM-DD")
export function estadoCobro(m, hoy) {
  const siguiente = m.last_paid_until
    ? addDays(m.last_paid_until, 1)
    : m.fecha_inicio;
  const inactiva =
    m.estado === "cancelada" || (m.fecha_fin && hoy > m.fecha_fin);
  if (inactiva)
    return {
      due_status: "inactivo",
      next_payment_date: siguiente,
      overdue_payments: 0,
      days_to_next: null,
    };
  if (hoy >= siguiente)
    return {
      due_status: "vencido",
      next_payment_date: siguiente,
      overdue_payments: mesesVencidos(hoy, siguiente),
      days_to_next: null,
    };
  const dias = diasEntre(hoy, siguiente);
  return {
    due_status: dias <= 5 ? "proximo" : "al_dia",
    next_payment_date: siguiente,
    overdue_payments: 0,
    days_to_next: dias,
  };
}

export function sugerirPago(m, hoy, meses) {
  const e = estadoCobro(m, hoy);
  if (e.due_status === "inactivo") return null;
  const n = meses ?? (e.due_status === "vencido" ? e.overdue_payments : 1);
  const desde = e.next_payment_date;
  return {
    meses: n,
    periodo_desde: desde,
    periodo_hasta: addDays(addMonths(desde, n), -1),
    monto: Math.round(Number(m.valor_mensual) * n * 100) / 100,
  };
}
