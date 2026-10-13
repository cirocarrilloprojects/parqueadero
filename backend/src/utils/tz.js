// backend/src/utils/tz.js
const partes = (tz, date) =>
  Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
      .formatToParts(date)
      .map((p) => [p.type, p.value]),
  );

// Diferencia (ms) entre la hora de pared en tz y UTC en ese instante.
function offsetMs(tz, date) {
  const p = partes(tz, date);
  const comoUtc = Date.UTC(
    +p.year,
    +p.month - 1,
    +p.day,
    +p.hour,
    +p.minute,
    +p.second,
  );
  return comoUtc - Math.floor(date.getTime() / 1000) * 1000;
}

/** "YYYY-MM-DD" del día actual (o de `date`) en la zona dada. */
export const ymdEnZona = (tz, date = new Date()) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(date);

/** Instante UTC en que empieza `ymd` (00:00 hora local) en la zona dada. */
export function inicioDiaUtc(tz, ymd) {
  const [y, m, d] = ymd.split("-").map(Number);
  const guess = Date.UTC(y, m - 1, d);
  const t0 = guess - offsetMs(tz, new Date(guess));
  return new Date(guess - offsetMs(tz, new Date(t0))); // segunda pasada: cambios de horario
}

/** Rango [inicio, fin) en UTC que cubre los días locales desdeYmd..hastaYmd inclusive. */
export function rangoDia(tz, desdeYmd, hastaYmd = desdeYmd) {
  const [y, m, d] = hastaYmd.split("-").map(Number);
  const siguiente = new Date(Date.UTC(y, m - 1, d + 1))
    .toISOString()
    .slice(0, 10);
  return [inicioDiaUtc(tz, desdeYmd), inicioDiaUtc(tz, siguiente)];
}

/** Hora de pared "YYYY-MM-DD HH:mm:ss" en `tz` → instante UTC. */
export function localToUtc(tz, texto) {
  const m = texto.match(
    /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/,
  );
  if (!m) throw new Error(`Fecha local inválida: ${texto}`);
  const guess = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] ?? 0));
  const t0 = guess - offsetMs(tz, new Date(guess));
  return new Date(guess - offsetMs(tz, new Date(t0)));
}

/** Date cuyo componente UTC muestra la hora local de `tz` (Excel no maneja zonas). */
export function paredComoUtc(tz, date) {
  const p = partes(tz, date);
  return new Date(
    Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second),
  );
}
