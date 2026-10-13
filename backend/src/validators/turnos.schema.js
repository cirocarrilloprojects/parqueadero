// backend/src/validators/turnos.schema.js
import { z } from "zod";

const dinero = z.coerce.number().min(0).max(999_999_999);

export const abrirTurnoSchema = z.object({
  base_inicial: dinero.default(0),
  observacion_apertura: z.string().trim().max(255).optional(),
});

export const cerrarTurnoSchema = z.object({
  total_efectivo: dinero.default(0),
  total_tarjeta: dinero.default(0),
  total_qr: dinero.default(0),
  observacion_cierre: z.string().trim().max(255).optional(),
});
