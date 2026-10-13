// backend/src/services/mensualidad.rules.test.js
import { describe, it, expect } from "vitest";
import {
  addDays,
  addMonths,
  estadoCobro,
  sugerirPago,
} from "./mensualidad.rules.js";

const base = {
  estado: "activa",
  fecha_inicio: "2026-10-01",
  fecha_fin: null,
  last_paid_until: null,
  valor_mensual: 100000,
};

describe("mensualidades", () => {
  it("fechas: cruza de mes y no desborda fin de mes", () => {
    expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
    expect(addMonths("2026-01-31", 1)).toBe("2026-02-28");
  });
  it("sin pagos y ya iniciada: vencida 1 mes, sugiere 1-oct a 31-oct", () => {
    expect(estadoCobro(base, "2026-10-13")).toMatchObject({
      due_status: "vencido",
      overdue_payments: 1,
    });
    expect(sugerirPago(base, "2026-10-13")).toEqual({
      meses: 1,
      periodo_desde: "2026-10-01",
      periodo_hasta: "2026-10-31",
      monto: 100000,
    });
  });
  it("dos meses de atraso", () => {
    expect(estadoCobro(base, "2026-11-01").overdue_payments).toBe(2);
    expect(sugerirPago(base, "2026-11-01").monto).toBe(200000);
  });
  it("próximo pago en ≤5 días", () => {
    expect(
      estadoCobro({ ...base, last_paid_until: "2026-10-31" }, "2026-10-28"),
    ).toMatchObject({ due_status: "proximo", days_to_next: 4 });
  });
  it("al día", () => {
    expect(
      estadoCobro({ ...base, last_paid_until: "2026-10-31" }, "2026-10-10")
        .due_status,
    ).toBe("al_dia");
  });
  it("cancelada o con fecha_fin vencida: inactiva y sin sugerencia", () => {
    expect(
      sugerirPago({ ...base, estado: "cancelada" }, "2026-10-13"),
    ).toBeNull();
    expect(
      estadoCobro({ ...base, fecha_fin: "2026-09-30" }, "2026-10-13")
        .due_status,
    ).toBe("inactivo");
  });
  it("pagar varios meses por adelantado", () => {
    expect(
      sugerirPago({ ...base, last_paid_until: "2026-10-31" }, "2026-10-10", 3),
    ).toMatchObject({
      periodo_desde: "2026-11-01",
      periodo_hasta: "2027-01-31",
      monto: 300000,
    });
  });
});
