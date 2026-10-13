// backend/src/services/tipos.service.js
import { AppError } from "../utils/AppError.js";
import { mapDb } from "../utils/mapDb.js";
import { tipoRepo } from "../repositories/tipoVehiculo.repository.js";

const noEncontrado = () =>
  new AppError("Tipo de vehículo no encontrado", 404, "NOT_FOUND");
const DUP = "Ya existe un tipo de vehículo con este código";

export const tiposService = {
  listar: (u) => tipoRepo.listar(u.empresaId),
  activos: (u) => tipoRepo.activos(u.empresaId),

  async obtener(u, id) {
    const t = await tipoRepo.porId(u.empresaId, id);
    if (!t) throw noEncontrado();
    return t;
  },
  async crear(u, d) {
    const id = await mapDb(() => tipoRepo.crear(u.empresaId, d), { dup: DUP });
    return { id };
  },
  async actualizar(u, id, d) {
    await this.obtener(u, id);
    await mapDb(() => tipoRepo.actualizar(u.empresaId, id, d), { dup: DUP });
  },
  async eliminar(u, id) {
    await this.obtener(u, id);
    const usos = await tipoRepo.usos(u.empresaId, id);
    if (usos.vehiculos > 0)
      throw new AppError(
        "No se puede eliminar un tipo que tiene vehículos asociados",
        409,
        "IN_USE",
      );
    if (usos.tarifas > 0)
      throw new AppError(
        "No se puede eliminar un tipo que tiene tarifas (desactívalo en su lugar)",
        409,
        "IN_USE",
      );
    await tipoRepo.eliminar(u.empresaId, id);
  },
};
