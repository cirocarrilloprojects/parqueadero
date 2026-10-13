// backend/src/routes/turnos.routes.js
import { Router } from "express";
import { authenticate } from "../middlewares/authenticate.js";
import { validate } from "../middlewares/validate.js";
import { idParamSchema } from "../validators/movimientos.schema.js";
import {
  abrirTurnoSchema,
  cerrarTurnoSchema,
} from "../validators/turnos.schema.js";
import { ok } from "../utils/http.js";
import { turnosService as s } from "../services/turnos.service.js";

const r = Router();
r.use(authenticate);
r.get("/actual", async (req, res) => ok(res, await s.actual(req.user)));
r.get("/resumen", async (req, res) => ok(res, await s.resumen(req.user)));
r.post("/abrir", validate({ body: abrirTurnoSchema }), async (req, res) =>
  ok(res, await s.abrir(req.user, req.valid.body), 201),
);
r.post("/cerrar", validate({ body: cerrarTurnoSchema }), async (req, res) =>
  ok(res, await s.cerrar(req.user, req.valid.body)),
);
r.get("/detalle/:id", validate({ params: idParamSchema }), async (req, res) =>
  ok(res, await s.detalle(req.user, req.valid.params.id)),
);
export default r;
