// backend/src/routes/mensualidades.routes.js
import { Router } from "express";
import { authenticate } from "../middlewares/authenticate.js";
import { validate } from "../middlewares/validate.js";
import { idParamSchema } from "../validators/movimientos.schema.js";
import {
  mensualidadSchema,
  mensualidadesQuerySchema,
  sugerenciaQuerySchema,
  pagoMensualidadSchema,
  pagoParamsSchema,
} from "../validators/mensualidades.schema.js";
import { ok } from "../utils/http.js";
import { mensualidadesService as s } from "../services/mensualidades.service.js";

const r = Router();
r.use(authenticate);
r.get("/", validate({ query: mensualidadesQuerySchema }), async (req, res) =>
  ok(res, await s.listar(req.user, req.valid.query)),
);
r.post("/", validate({ body: mensualidadSchema }), async (req, res) =>
  ok(res, await s.crear(req.user, req.valid.body), 201),
);
r.get("/:id", validate({ params: idParamSchema }), async (req, res) =>
  ok(res, await s.obtener(req.user, req.valid.params.id)),
);
r.put(
  "/:id",
  validate({ params: idParamSchema, body: mensualidadSchema }),
  async (req, res) => (
    await s.actualizar(req.user, req.valid.params.id, req.valid.body),
    ok(res, { updated: true })
  ),
);
r.get("/:id/pagos", validate({ params: idParamSchema }), async (req, res) =>
  ok(res, await s.pagos(req.user, req.valid.params.id)),
);
r.post(
  "/:id/pagos",
  validate({ params: idParamSchema, body: pagoMensualidadSchema }),
  async (req, res) =>
    ok(res, await s.pagar(req.user, req.valid.params.id, req.valid.body), 201),
);
r.get(
  "/:id/sugerencia-pago",
  validate({ params: idParamSchema, query: sugerenciaQuerySchema }),
  async (req, res) =>
    ok(
      res,
      await s.sugerencia(req.user, req.valid.params.id, req.valid.query.meses),
    ),
);
r.get(
  "/:id/pagos/:idPago/recibo",
  validate({ params: pagoParamsSchema }),
  async (req, res) =>
    ok(
      res,
      await s.recibo(req.user, req.valid.params.id, req.valid.params.idPago),
    ),
);
export default r;
