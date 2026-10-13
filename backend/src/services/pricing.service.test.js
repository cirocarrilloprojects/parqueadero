// backend/src/services/pricing.service.test.js
import { describe, it, expect } from "vitest";
import { calcularTotal } from "./pricing.service.js";

const base = {
  modo_cobro: "mixto",
  valor_minuto: 100,
  valor_hora: 2000,
  valor_dia_completo: 15000,
  paso_minutos_a_horas: 30,
  paso_horas_a_dias: 5,
  redondeo_horas: "arriba",
  redondeo_dias: "arriba",
};

describe("modo mixto (regla del código original)", () => {
  it("hasta el paso: todo por minuto", () => {
    expect(calcularTotal(20, base).total).toBe(2000);
    expect(calcularTotal(30, base).total).toBe(2000 + 1000);
  });
  it("1h10m = 30 min + 1 hora", () => {
    expect(calcularTotal(70, base)).toEqual({
      total: 5000,
      dias: 0,
      horas: 1,
      minutos: 30,
    });
  });
  it("supera el tope de horas: el resto pasa a día", () => {
    // 600 min: 30 min + 5 h (tope) + 1 día
    expect(calcularTotal(600, base)).toEqual({
      total: 3000 + 10000 + 15000,
      dias: 1,
      horas: 5,
      minutos: 30,
    });
  });
  it("paso 0 cobra todo por minuto (comportamiento heredado)", () => {
    expect(calcularTotal(90, { ...base, paso_minutos_a_horas: 0 }).total).toBe(
      9000,
    );
  });
  it("redondeo exacto de horas + días arriba cobra un día por el sobrante (heredado)", () => {
    const t = { ...base, redondeo_horas: "exacto" };
    expect(calcularTotal(100, t).total).toBe(3000 + 2000 + 15000);
  });
});

describe("otros modos", () => {
  it("minuto", () =>
    expect(calcularTotal(45, { ...base, modo_cobro: "minuto" }).total).toBe(
      4500,
    ));
  it("hora redondea hacia arriba", () =>
    expect(calcularTotal(61, { ...base, modo_cobro: "hora" })).toMatchObject({
      total: 4000,
      horas: 2,
    }));
  it("día redondea hacia arriba", () =>
    expect(calcularTotal(1441, { ...base, modo_cobro: "dia" })).toMatchObject({
      total: 30000,
      dias: 2,
    }));
  it("minutos negativos se tratan como 0", () =>
    expect(calcularTotal(-5, base).total).toBe(0));
});
