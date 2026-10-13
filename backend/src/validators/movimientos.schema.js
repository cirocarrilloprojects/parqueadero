// backend/src/validators/movimientos.schema.js
import { z } from "zod";

const placa = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9-]{3,10}$/, "Placa inválida");

export const ingresoSchema = {
  body: z.object({ placa, id_tipo: z.coerce.number().int().positive() }),
};

export const calcularSalidaSchema = { body: z.object({ placa }) };

export const confirmarSalidaSchema = {
  body: z.object({
    placa,
    pagos: z
      .array(
        z.object({
          metodo_pago: z.enum(["efectivo", "tarjeta", "QR", "transferencia"]),
          monto: z.coerce.number().positive().max(100_000_000),
          referencia: z.string().trim().max(100).optional(),
        }),
      )
      .min(1, "Debe registrar al menos un pago")
      .max(10),
  }),
};

export const idParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});
