// backend/src/routes/movimientos.routes.js
import { Router } from "express";
import { authenticate } from "../middlewares/authenticate.js";
import { validate } from "../middlewares/validate.js";
import * as s from "../validators/movimientos.schema.js";
import * as ctrl from "../controllers/movimientos.controller.js";

const router = Router();
router.use(authenticate); // todo este grupo exige sesión

router.post("/ingreso", validate(s.ingresoSchema), ctrl.ingreso);
router.post(
  "/calcular-salida",
  validate(s.calcularSalidaSchema),
  ctrl.calcularSalida,
);
router.post(
  "/confirmar-salida",
  validate(s.confirmarSalidaSchema),
  ctrl.confirmarSalida,
);
router.get("/detalle/:id", validate(s.idParamSchema), ctrl.detalle);

export default router;
