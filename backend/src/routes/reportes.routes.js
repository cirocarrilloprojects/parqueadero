// backend/src/routes/reportes.routes.js
import { Router } from "express";
import { authenticate, requireRole } from "../middlewares/authenticate.js";
import { validate } from "../middlewares/validate.js";
import { reporteQuerySchema } from "../validators/reportes.schema.js";
import { ok } from "../utils/http.js";
import { reportesService as s } from "../services/reportes.service.js";

const XLSX =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const enviarLibro = async (res, { libro, nombre }) => {
  res.set({
    "Content-Type": XLSX,
    "Content-Disposition": `attachment; filename="${nombre}"`,
  });
  await libro.xlsx.write(res);
  res.end();
};

const r = Router();
r.use(authenticate, requireRole("admin"));
const q = validate({ query: reporteQuerySchema });
r.get("/resumen", q, async (req, res) =>
  ok(res, await s.resumen(req.user, req.valid.query)),
);
r.get("/movimientos", q, async (req, res) =>
  ok(res, await s.movimientos(req.user, req.valid.query)),
);
r.get("/movimientos/export", q, async (req, res) =>
  ok(res, await s.movimientosExport(req.user, req.valid.query)),
);
r.get("/top-placas", q, async (req, res) =>
  ok(res, await s.topPlacas(req.user, req.valid.query)),
);
r.get("/turnos", q, async (req, res) =>
  ok(res, await s.turnos(req.user, req.valid.query)),
);
r.get("/por-usuario", q, async (req, res) =>
  ok(res, await s.porUsuario(req.user, req.valid.query)),
);
r.get("/export/xlsx", q, async (req, res) =>
  enviarLibro(res, await s.excel(req.user, req.valid.query)),
);
r.get("/turnos/export/xlsx", q, async (req, res) =>
  enviarLibro(res, await s.excelTurnos(req.user, req.valid.query)),
);
r.get("/por-usuario/export/xlsx", q, async (req, res) =>
  enviarLibro(res, await s.excelPorUsuario(req.user, req.valid.query)),
);
export default r;
