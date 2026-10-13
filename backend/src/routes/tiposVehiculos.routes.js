// backend/src/routes/tiposVehiculos.routes.js
import { Router } from "express";
import { authenticate, requireRole } from "../middlewares/authenticate.js";
import { validate } from "../middlewares/validate.js";
import { idParamSchema } from "../validators/movimientos.schema.js";
import { tipoSchema } from "../validators/tipos.schema.js";
import { tiposController as c } from "../controllers/tipos.controller.js";

const r = Router();
r.use(authenticate);
r.get("/", c.listar);
r.get("/activos", c.activos); // antes de "/:id"
r.get("/:id", validate({ params: idParamSchema }), c.obtener);
r.post("/", requireRole("admin"), validate({ body: tipoSchema }), c.crear);
r.put(
  "/:id",
  requireRole("admin"),
  validate({ params: idParamSchema, body: tipoSchema }),
  c.actualizar,
);
r.delete(
  "/:id",
  requireRole("admin"),
  validate({ params: idParamSchema }),
  c.eliminar,
);
export default r;
