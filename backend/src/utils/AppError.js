// backend/src/utils/AppError.js
// Error "esperado" de negocio con código HTTP. El errorHandler lo convierte en respuesta JSON.
// Los demás errores (bugs) se tratan como 500 y NO se exponen al cliente.
export class AppError extends Error {
  constructor(status, message, code = "ERROR", details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
  static badRequest(msg, code = "BAD_REQUEST", details) {
    return new AppError(400, msg, code, details);
  }
  static unauthorized(msg = "No autenticado", code = "UNAUTHORIZED") {
    return new AppError(401, msg, code);
  }
  static forbidden(msg = "No autorizado", code = "FORBIDDEN") {
    return new AppError(403, msg, code);
  }
  static notFound(msg = "No encontrado", code = "NOT_FOUND") {
    return new AppError(404, msg, code);
  }
  static conflict(msg, code = "CONFLICT") {
    return new AppError(409, msg, code);
  }
  static tooMany(msg, code = "TOO_MANY_REQUESTS") {
    return new AppError(429, msg, code);
  }
}
