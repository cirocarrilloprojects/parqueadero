// backend/src/routes/usuarios.routes.js
import { Router } from "express";
import { authenticate, requireRole } from "../middlewares/authenticate.js";
import { validate } from "../middlewares/validate.js";
import { idParamSchema } from "../validators/movimientos.schema.js";
import {
  usuarioCrearSchema,
  usuarioActualizarSchema,
} from "../validators/usuarios.schema.js";
import { ok } from "../utils/http.js";
import { usuariosService as s } from "../services/usuarios.service.js";

const r = Router();
r.use(authenticate, requireRole("admin"));

r.get("/", async (req, res) => ok(res, await s.listar(req.user)));

r.post("/", validate({ body: usuarioCrearSchema }), async (req, res) =>
  ok(res, await s.crear(req.user, req.valid.body), 201),
);

r.put(
  "/:id",
  validate({ params: idParamSchema, body: usuarioActualizarSchema }),
  async (req, res) => (
    await s.actualizar(req.user, req.valid.params.id, req.valid.body),
    ok(res, { updated: true })
  ),
);

r.delete(
  "/:id",
  validate({ params: idParamSchema }),
  async (req, res) => (
    await s.desactivar(req.user, req.valid.params.id),
    ok(res, { deactivated: true })
  ),
);

export default r;
