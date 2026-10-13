// backend/src/routes/empresa.routes.js
import { Router } from "express";
import multer from "multer";
import { authenticate, requireRole } from "../middlewares/authenticate.js";
import { validate } from "../middlewares/validate.js";
import { empresaSchema, configSchema } from "../validators/empresa.schema.js";
import { AppError } from "../utils/AppError.js";
import { ok } from "../utils/http.js";
import { empresaService as s } from "../services/empresa.service.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024, files: 1 },
});
const subir = (req, res, next) =>
  upload.single("logo")(req, res, (err) => {
    if (!err) return next();
    next(
      err.code === "LIMIT_FILE_SIZE"
        ? new AppError("El archivo excede 2 MB", 413, "FILE_TOO_LARGE")
        : new AppError("Archivo inválido", 400, "BAD_FILE"),
    );
  });

const r = Router();
r.use(authenticate);
r.get("/me", async (req, res) => ok(res, await s.perfil(req.user)));
r.get("/config", async (req, res) => ok(res, await s.config(req.user)));
r.put(
  "/",
  requireRole("admin"),
  validate({ body: empresaSchema }),
  async (req, res) => (
    await s.actualizarPerfil(req.user, req.valid.body),
    ok(res, { updated: true })
  ),
);
r.put(
  "/config",
  requireRole("admin"),
  validate({ body: configSchema }),
  async (req, res) => (
    await s.actualizarConfig(req.user, req.valid.body),
    ok(res, { updated: true })
  ),
);

// Se sirve como imagen real: el frontend usa <img src="/api/empresa/logo"> (la cookie viaja sola).
r.get("/logo", async (req, res) => {
  const l = await s.logo(req.user);
  if (!l) throw new AppError("Logo no configurado", 404, "NOT_FOUND");
  res
    .set({ "Content-Type": l.mime, "Cache-Control": "private, no-cache" })
    .send(l.datos);
});
r.post(
  "/logo",
  requireRole("admin"),
  subir,
  async (req, res) => (
    await s.subirLogo(req.user, req.file),
    ok(res, { updated: true }, 201)
  ),
);
export default r;
