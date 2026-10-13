// backend/src/controllers/tiposVehiculos.controller.js
import * as repo from "../repositories/tipoVehiculo.repository.js";

export async function listActivos(req, res) {
  res.json({ success: true, data: await repo.listActivos(req.user.empresaId) });
}
