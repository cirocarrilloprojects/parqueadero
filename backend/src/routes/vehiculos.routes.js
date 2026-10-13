// backend/src/routes/vehiculos.routes.js
import { Router } from "express";
import { authenticate } from "../middlewares/authenticate.js";
import { validate } from "../middlewares/validate.js";
import { idParamSchema } from "../validators/movimientos.schema.js";
import { vehiculoSchema } from "../validators/vehiculos.schema.js";
import { vehiculosController as c } from "../controllers/vehiculos.controller.js";

const r = Router();
r.use(authenticate);
r.get("/", c.listar);
r.get("/:id", validate({ params: idParamSchema }), c.obtener);
r.get("/:id/historial", validate({ params: idParamSchema }), c.historial);
r.post("/", validate({ body: vehiculoSchema }), c.crear);
r.put(
  "/:id",
  validate({ params: idParamSchema, body: vehiculoSchema }),
  c.actualizar,
);
r.delete("/:id", validate({ params: idParamSchema }), c.eliminar);
export default r;
