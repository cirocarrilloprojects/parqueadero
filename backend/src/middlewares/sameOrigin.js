// backend/src/middlewares/sameOrigin.js
import { env } from "../config/env.js";
import { AppError } from "../utils/AppError.js";

const SEGUROS = new Set(["GET", "HEAD", "OPTIONS"]);

export function sameOrigin(req, res, next) {
  if (SEGUROS.has(req.method)) return next();
  const origen = req.get("origin");
  if (!origen) return next(); // curl, tests y clientes que no son navegador
  const propios = new Set([
    env.CORS_ORIGIN,
    `${req.protocol}://${req.get("host")}`,
  ]);
  return propios.has(origen)
    ? next()
    : next(new AppError("Origen no permitido", 403, "BAD_ORIGIN"));
}
