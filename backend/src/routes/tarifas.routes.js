// backend/src/routes/tarifas.routes.js
import { Router } from "express";
import { authenticate, requireRole } from "../middlewares/authenticate.js";
import { validate } from "../middlewares/validate.js";
import { tarifaSchema } from "../validators/tarifas.schema.js";
import { ok } from "../utils/http.js";
import { tarifasService as s } from "../services/tarifas.service.js";

const r = Router();
r.use(authenticate);
r.get("/current", async (req, res) => ok(res, await s.vigentes(req.user)));
r.put(
  "/",
  requireRole("admin"),
  validate({ body: tarifaSchema }),
  async (req, res) => ok(res, await s.reemplazar(req.user, req.valid.body)),
);
export default r;
