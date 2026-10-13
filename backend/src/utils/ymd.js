// frontend/src/utils/ymd.js
/** "YYYY-MM-DD" de hoy en la zona dada. */
export function hoyYmd(tz) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(new Date());
}

/** Suma días a un "YYYY-MM-DD" y devuelve otro "YYYY-MM-DD". */
export function addDaysYmd(ymd, dias) {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + dias));
  return dt.toISOString().slice(0, 10);
}

/** Primer y último día del mes de `ymd`. */
export function mesYmd(ymd) {
  const [y, m] = ymd.split("-").map(Number);
  const primero = new Date(Date.UTC(y, m - 1, 1)).toISOString().slice(0, 10);
  const ultimo = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
  return [primero, ultimo];
}

/** "2026-10-13" → "13/10/2026" para ejes de gráficos. */
export function fmtYmd(ymd) {
  const [y, m, d] = String(ymd).split("-");
  return `${d}/${m}/${y}`;
}

/** Query string desde un objeto, ignorando valores vacíos. */
export function qs(obj) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(obj ?? {})) {
    if (v === "" || v == null) continue;
    p.set(k, v);
  }
  return p.toString();
}
