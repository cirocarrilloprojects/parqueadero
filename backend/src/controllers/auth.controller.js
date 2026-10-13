// backend/src/controllers/auth.controller.js
import { env } from "../config/env.js";
import { COOKIE_NAME } from "../middlewares/authenticate.js";
import * as authService from "../services/auth.service.js";

// Controlador = capa HTTP delgada: traduce request -> servicio -> response. Sin reglas de negocio.
const cookieOpts = {
  httpOnly: true, // inaccesible desde JS del navegador (anti-XSS)
  secure: env.COOKIE_SECURE, // solo HTTPS en producción
  sameSite: "lax", // la cookie no viaja en peticiones cross-site (mitiga CSRF)
  maxAge: env.JWT_EXPIRES_HOURS * 3600 * 1000,
  path: "/",
};

export async function login(req, res) {
  const { token, session } = await authService.login({
    ...req.valid.body,
    ip: req.ip,
  });
  res.cookie(COOKIE_NAME, token, cookieOpts);
  res.json({ success: true, data: session }); // el token NO viaja en el JSON
}

export async function me(req, res) {
  res.json({ success: true, data: await authService.getSession(req.user) });
}

export function logout(_req, res) {
  res.clearCookie(COOKIE_NAME, { ...cookieOpts, maxAge: undefined });
  res.json({ success: true });
}
