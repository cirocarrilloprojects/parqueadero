// frontend/src/utils/format.js
// Reemplazo de datetime.js (~170 líneas). El backend entrega fechas ISO en UTC ("...Z") y
// aquí solo se muestran en la zona de la empresa con la API nativa Intl.
export const formatMoney = (n, currency = "COP") =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(Number(n ?? 0));

export const formatDateTime = (iso, timeZone = "America/Bogota") =>
  iso
    ? new Intl.DateTimeFormat("es-CO", {
        dateStyle: "short",
        timeStyle: "short",
        timeZone,
      }).format(new Date(iso))
    : "";
