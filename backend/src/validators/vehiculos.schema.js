// backend/src/validators/vehiculos.schema.js
import { z } from "zod";

export const vehiculoSchema = z.object({
  placa: z
    .string()
    .trim()
    .toUpperCase()
    .regex(
      /^[A-Z0-9-]{1,10}$/,
      "Placa inválida (letras, números y guion, máx. 10)",
    ),
  id_tipo: z.coerce
    .number()
    .int()
    .positive("El tipo de vehículo es obligatorio"),
  color: z.string().trim().min(1, "El color es obligatorio").max(30),
  modelo: z.string().trim().max(50).optional().default(""),
});
