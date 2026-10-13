// backend/src/controllers/tipos.controller.js
import { ok } from "../utils/http.js";
import { tiposService as s } from "../services/tipos.service.js";

export const tiposController = {
  listar: async (req, res) => ok(res, await s.listar(req.user)),
  activos: async (req, res) => ok(res, await s.activos(req.user)),
  obtener: async (req, res) =>
    ok(res, await s.obtener(req.user, req.valid.params.id)),
  crear: async (req, res) =>
    ok(res, await s.crear(req.user, req.valid.body), 201),
  actualizar: async (req, res) => (
    await s.actualizar(req.user, req.valid.params.id, req.valid.body),
    ok(res, { updated: true })
  ),
  eliminar: async (req, res) => (
    await s.eliminar(req.user, req.valid.params.id),
    ok(res, { deleted: true })
  ),
};
