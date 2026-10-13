// backend/src/routes/dashboard.routes.js
import { Router } from "express";
import { authenticate } from "../middlewares/authenticate.js";
import { validate } from "../middlewares/validate.js";
import { dashboardQuerySchema } from "../validators/dashboard.schema.js";
import { ok } from "../utils/http.js";
import { dashboardService } from "../services/dashboard.service.js";

const r = Router();
r.get(
  "/stats",
  authenticate,
  validate({ query: dashboardQuerySchema }),
  async (req, res) =>
    ok(res, await dashboardService.stats(req.user, req.valid.query)),
);
export default r;
