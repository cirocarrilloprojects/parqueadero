// frontend/src/utils/ymd.js
export const fmtYmd = (s) => (s ? s.split("-").reverse().join("/") : "");
export const hoyYmd = (tz) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(new Date());
export const addDaysYmd = (s, n) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
};
export function mesYmd(s) {
  const [y, m] = s.split("-").map(Number);
  const mm = String(m).padStart(2, "0");
  return [
    `${y}-${mm}-01`,
    `${y}-${mm}-${String(new Date(Date.UTC(y, m, 0)).getUTCDate()).padStart(2, "0")}`,
  ];
}
export const qs = (o) =>
  new URLSearchParams(
    Object.entries(o).filter(
      ([, v]) => v !== undefined && v !== null && v !== "",
    ),
  ).toString();
