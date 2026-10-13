// backend/src/routes/ticket.routes.js
import { Router } from "express";
import { authenticate } from "../middlewares/authenticate.js";
import { validate } from "../middlewares/validate.js";
import { idParamSchema } from "../validators/movimientos.schema.js";
import { ok } from "../utils/http.js";
import { ticketsService } from "../services/tickets.service.js";

const r = Router();
r.get(
  "/:id/ticket",
  authenticate,
  validate({ params: idParamSchema }),
  async (req, res) =>
    ok(res, await ticketsService.obtener(req.user, req.valid.params.id)),
);
export default r;
