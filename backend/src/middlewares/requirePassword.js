// backend/src/middlewares/requirePassword.js
import bcrypt from "bcryptjs";
import { AppError } from "../utils/AppError.js";
import { findPasswordHash } from "../repositories/usuario.repository.js";

const TTL_MS = 15 * 60 * 1000;
const MAX_FAILS = 3;
const LOCK_MS = 5 * 60 * 1000;

const state = new Map();

const entry = (id) =>
  state.get(id) ?? { verifiedUntil: 0, fails: 0, lockedUntil: 0 };

const save = (id, e) => state.set(id, e);

setInterval(() => {
  const now = Date.now();
  for (const [id, e] of state) {
    if (e.verifiedUntil < now && e.lockedUntil < now && e.fails === 0)
      state.delete(id);
  }
}, TTL_MS).unref?.();

export async function requirePassword(req, _res, next) {
  const userId = req.user.id;
  const now = Date.now();
  let e = entry(userId);

  if (e.lockedUntil > now) {
    const segs = Math.ceil((e.lockedUntil - now) / 1000);
    throw AppError.tooMany(
      `Demasiados intentos. Intenta de nuevo en ${segs} s.`,
      "PASSWORD_LOCKED",
    );
  }

  if (e.verifiedUntil > now) {
    req.adminVerifiedAt = e.verifiedUntil;
    return next();
  }

  const pwd = req.valid?.body?.admin_password;
  if (!pwd) {
    throw AppError.badRequest(
      "Debes confirmar tu contraseña para continuar.",
      "PASSWORD_REQUIRED",
    );
  }

  const hash = await findPasswordHash(userId, req.user.empresaId);
  if (!hash) throw AppError.unauthorized();

  const ok = await bcrypt.compare(pwd, hash);
  if (!ok) {
    e = { ...e, fails: e.fails + 1 };
    if (e.fails >= MAX_FAILS) {
      e.lockedUntil = now + LOCK_MS;
      e.fails = 0;
    }
    save(userId, e);
    throw AppError.forbidden("Contraseña incorrecta.", "PASSWORD_INVALID");
  }

  e = { verifiedUntil: now + TTL_MS, fails: 0, lockedUntil: 0 };
  save(userId, e);
  req.adminVerifiedAt = e.verifiedUntil;
  next();
}
