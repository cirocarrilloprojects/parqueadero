// backend/src/services/tarifas.service.js
import { withTransaction } from "../config/db.js";
import { AppError } from "../utils/AppError.js";
import { tarifaRepo } from "../repositories/tarifa.repository.js";
import { tipoRepo } from "../repositories/tipoVehiculo.repository.js";

// Pone en cero lo que el modo no usa (mismo comportamiento que el original).
function normalizar(d) {
  const t = { ...d };
  if (t.modo_cobro !== "mixto") {
    t.paso_minutos_a_horas = 0;
    t.paso_horas_a_dias = 0;
  }
  if (t.modo_cobro === "minuto")
    Object.assign(t, { valor_hora: 0, valor_dia_completo: 0 });
  if (t.modo_cobro === "hora")
    Object.assign(t, { valor_minuto: 0, valor_dia_completo: 0 });
  if (t.modo_cobro === "dia")
    Object.assign(t, { valor_minuto: 0, valor_hora: 0 });
  return t;
}

export const tarifasService = {
  vigentes: (u) => tarifaRepo.vigentes(u.empresaId),

  async reemplazar(u, d) {
    const tipo = await tipoRepo.porId(u.empresaId, d.id_tipo);
    if (!tipo || !tipo.activo)
      throw new AppError(
        "Tipo de vehículo no válido o inactivo",
        400,
        "INVALID_TYPE",
      );
    const id = await withTransaction((conn) =>
      tarifaRepo.reemplazar(conn, u.empresaId, normalizar(d)),
    );
    return { id };
  },
};
