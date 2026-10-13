// backend/src/middlewares/errorHandler.js
import { ZodError } from "zod";
import { AppError } from "../utils/AppError.js";
import { env } from "../config/env.js";

// 404 para rutas /api inexistentes
export const notFoundHandler = (_req, res) =>
  res
    .status(404)
    .json({ success: false, code: "NOT_FOUND", message: "Ruta no encontrada" });

// Middleware de errores: Express lo reconoce por tener 4 parámetros (err, req, res, next).
// Centraliza TODA la salida de errores => formato único { success:false, code, message }.
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  if (err instanceof AppError) {
    return res.status(err.status).json({
      success: false,
      code: err.code,
      message: err.message,
      details: err.details,
    });
  }
  if (err instanceof ZodError) {
    return res.status(400).json({
      success: false,
      code: "VALIDATION_ERROR",
      message: "Datos inválidos",
      details: err.issues.map((i) => ({
        campo: i.path.join("."),
        mensaje: i.message,
      })),
    });
  }
  if (err?.code === "ER_DUP_ENTRY") {
    return res.status(409).json({
      success: false,
      code: "DUPLICATE",
      message: "El registro ya existe",
    });
  }
  if (err?.type === "entity.parse.failed") {
    // JSON mal formado
    return res
      .status(400)
      .json({ success: false, code: "BAD_JSON", message: "JSON inválido" });
  }
  // Error inesperado: lo registramos completo en el servidor, pero al cliente solo un mensaje genérico.
  console.error("[500]", req.method, req.originalUrl, err);
  return res.status(500).json({
    success: false,
    code: "INTERNAL",
    message: "Error interno del servidor",
    ...(env.NODE_ENV === "development" && { debug: err.message }),
  });
}
