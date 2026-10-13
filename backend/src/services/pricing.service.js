// backend/src/services/pricing.service.js
// Réplica fiel de calcularTotal/calcularTotalMixto del sistema original.
// Aritmética en centavos enteros para evitar errores de coma flotante.

const toCents = (v) => Math.round(Number(v || 0) * 100);
const fromCents = (c) => c / 100;

function mixto(minutos, t) {
  const cMin = toCents(t.valor_minuto);
  const cHor = toCents(t.valor_hora);
  const cDia = toCents(t.valor_dia_completo);
  const pasoMin = Number(t.paso_minutos_a_horas || 0);
  const pasoHor = Number(t.paso_horas_a_dias || 0);
  const redHor = t.redondeo_horas || "arriba";
  const redDia = t.redondeo_dias || "arriba";

  let restante = minutos;
  let total = 0;
  let dias = 0;
  let horas = 0;
  let mins;

  // Etapa 1: minutos
  if (pasoMin > 0 && restante > pasoMin) {
    mins = pasoMin;
    restante -= pasoMin;
  } else {
    mins = restante;
    restante = 0;
  }
  total += mins * cMin;

  // Etapa 2: horas
  if (restante > 0) {
    const h =
      redHor === "arriba"
        ? Math.ceil(restante / 60)
        : Math.floor(restante / 60);
    horas = pasoHor > 0 && h > pasoHor ? pasoHor : h;
    total += horas * cHor;
    restante -= horas * 60;
  }

  // Etapa 3: días
  if (restante > 0) {
    dias =
      redDia === "arriba"
        ? Math.ceil(restante / 1440)
        : Math.floor(restante / 1440);
    total += dias * cDia;
  }

  return { total: fromCents(total), dias, horas, minutos: mins };
}

export function calcularTotal(minutos, tarifa) {
  const m = Math.max(0, Math.trunc(Number(minutos) || 0));
  const modo = tarifa.modo_cobro || "mixto";

  if (modo === "minuto") {
    return {
      total: fromCents(m * toCents(tarifa.valor_minuto)),
      dias: 0,
      horas: 0,
      minutos: m,
    };
  }
  if (modo === "hora") {
    const horas = Math.ceil(m / 60);
    return {
      total: fromCents(horas * toCents(tarifa.valor_hora)),
      dias: 0,
      horas,
      minutos: m % 60,
    };
  }
  if (modo === "dia") {
    const dias = Math.ceil(m / 1440);
    return {
      total: fromCents(dias * toCents(tarifa.valor_dia_completo)),
      dias,
      horas: 0,
      minutos: m % 1440,
    };
  }
  return mixto(m, tarifa);
}
