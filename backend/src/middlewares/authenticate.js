// backend/src/middlewares/authenticate.js
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { AppError } from "../utils/AppError.js";
import { sesionVigente } from "./sessionGuard.js";

export const COOKIE_NAME = "ps_token";

// Lee el JWT de la cookie httpOnly. Además, verifica contra la BD que el usuario
// siga activo y con el rol actual (no el del token, que puede estar desactualizado).
export async function authenticate(req, _res, next) {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) throw AppError.unauthorized();

  let payload;
  try {
    // algorithms fijo: evita ataques de "alg: none" / confusión de algoritmo
    payload = jwt.verify(token, env.JWT_SECRET, { algorithms: ["HS256"] });
  } catch {
    throw AppError.unauthorized("Sesión inválida o expirada", "TOKEN_INVALID");
  }

  req.user = {
    id: payload.sub,
    empresaId: payload.emp,
    rol: payload.rol,
    nombre: payload.nom,
  };

  // El token puede ser válido pero el usuario ya no estar activo,
  // o su rol haber cambiado. La BD manda.
  const vigente = await sesionVigente(req.user);
  if (!vigente) throw new AppError("Sesión no válida", 401, "SESSION_INVALID");
  req.user.rol = vigente.rol;

  next();
}

// Fábrica de middleware de autorización por rol: requireRole('admin')
export const requireRole =
  (...roles) =>
  (req, _res, next) => {
    if (!roles.includes(req.user?.rol))
      throw AppError.forbidden("Requiere rol: " + roles.join(" o "));
    next();
  };
