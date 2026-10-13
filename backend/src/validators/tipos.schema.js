// backend/src/validators/tipos.schema.js
import { z } from "zod";

export const tipoSchema = z.object({
  nombre: z.string().trim().min(1, "El nombre es obligatorio").max(50),
  codigo: z
    .string()
    .trim()
    .min(1, "El código es obligatorio")
    .max(20)
    .transform((v) => v.toLowerCase().replace(/\s+/g, "_"))
    .pipe(
      z.string().regex(/^[a-z0-9_]+$/, "Solo letras, números y guiones bajos"),
    ),
  capacidad: z.coerce.number().int().min(0).max(100000).default(0),
  activo: z.boolean().default(true),
});
