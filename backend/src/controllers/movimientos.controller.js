// backend/src/controllers/movimientos.controller.js
import * as service from "../services/movimientos.service.js";

// Cada handler es async y SIN try/catch: Express 5 envía el error rechazado al errorHandler.
export async function ingreso(req, res) {
  const { placa, id_tipo } = req.valid.body;
  const data = await service.registrarIngreso({
    empresaId: req.user.empresaId,
    usuarioId: req.user.id,
    placa,
    tipoId: id_tipo,
  });
  res.status(201).json({ success: true, data });
}

export async function calcularSalida(req, res) {
  const data = await service.calcularSalida({
    empresaId: req.user.empresaId,
    placa: req.valid.body.placa,
  });
  res.json({ success: true, data });
}

export async function confirmarSalida(req, res) {
  const { placa, pagos } = req.valid.body;
  const data = await service.confirmarSalida({
    empresaId: req.user.empresaId,
    usuarioId: req.user.id,
    placa,
    pagos,
  });
  res.json({ success: true, data });
}

export async function detalle(req, res) {
  const data = await service.getDetalle({
    id: req.valid.params.id,
    empresaId: req.user.empresaId,
  });
  res.json({ success: true, data });
}
