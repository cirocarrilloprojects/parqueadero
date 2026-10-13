// backend/src/services/vehiculos.service.js
import { AppError } from "../utils/AppError.js";
import { mapDb } from "../utils/mapDb.js";
import { vehiculoRepo } from "../repositories/vehiculo.repository.js";
import { tipoRepo } from "../repositories/tipoVehiculo.repository.js";

async function exigirTipoActivo(empresaId, idTipo) {
  const t = await tipoRepo.porId(empresaId, idTipo);
  if (!t || !t.activo)
    throw new AppError(
      "Tipo de vehículo no válido o inactivo",
      400,
      "INVALID_TYPE",
    );
}
const DUP = "Ya existe un vehículo con esta placa";

export const vehiculosService = {
  listar: (u) => vehiculoRepo.listar(u.empresaId),

  async obtener(u, id) {
    const v = await vehiculoRepo.porId(u.empresaId, id);
    if (!v) throw new AppError("Vehículo no encontrado", 404, "NOT_FOUND");
    return v;
  },
  async historial(u, id) {
    await this.obtener(u, id); // valida pertenencia a la empresa
    return vehiculoRepo.historial(u.empresaId, id);
  },
  async crear(u, d) {
    await exigirTipoActivo(u.empresaId, d.id_tipo);
    const id = await mapDb(() => vehiculoRepo.crear(u.empresaId, d), {
      dup: DUP,
    });
    return { id };
  },
  async actualizar(u, id, d) {
    const actual = await this.obtener(u, id);
    await exigirTipoActivo(u.empresaId, d.id_tipo);
    if (actual.id_tipo !== d.id_tipo && (await vehiculoRepo.estaDentro(id)))
      throw new AppError(
        "No se puede cambiar el tipo mientras el vehículo está dentro",
        409,
        "VEHICLE_INSIDE",
      );
    await mapDb(() => vehiculoRepo.actualizar(u.empresaId, id, d), {
      dup: DUP,
    });
  },
  async eliminar(u, id) {
    await this.obtener(u, id);
    if (await vehiculoRepo.estaDentro(id))
      throw new AppError(
        "No se puede eliminar un vehículo con movimientos activos",
        409,
        "VEHICLE_INSIDE",
      );
    await mapDb(() => vehiculoRepo.eliminar(u.empresaId, id), {
      fk: "El vehículo tiene historial o mensualidades y no puede eliminarse",
    });
  },
};
