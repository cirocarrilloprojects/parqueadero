// backend/src/utils/tz.test.js
import { describe, it, expect } from "vitest";
import { ymdEnZona, inicioDiaUtc, rangoDia } from "./tz.js";

describe("zona horaria de la empresa", () => {
  it("después de las 7 pm en Bogotá, 'hoy' sigue siendo el mismo día (bug original)", () => {
    expect(ymdEnZona("America/Bogota", new Date("2026-10-14T03:00:00Z"))).toBe(
      "2026-10-13",
    );
  });
  it("el día local de Bogotá empieza a las 05:00 UTC", () => {
    expect(inicioDiaUtc("America/Bogota", "2026-10-13").toISOString()).toBe(
      "2026-10-13T05:00:00.000Z",
    );
  });
  it("rango de un día = 24 h", () => {
    const [a, b] = rangoDia("America/Bogota", "2026-10-13");
    expect(b - a).toBe(24 * 3600 * 1000);
  });
  it("respeta otras zonas (Ciudad de México, UTC-6 sin horario de verano)", () => {
    expect(
      inicioDiaUtc("America/Mexico_City", "2026-10-13").toISOString(),
    ).toBe("2026-10-13T06:00:00.000Z");
  });
});
