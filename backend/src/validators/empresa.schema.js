// backend/src/validators/empresa.schema.js
import { z } from "zod";

export const empresaSchema = z.object({
  nombre: z.string().trim().min(1, "El nombre es obligatorio").max(100),
  nit: z.string().trim().min(3, "El NIT es obligatorio").max(20),
  direccion: z.string().trim().max(200).optional().default(""),
  telefono: z.string().trim().max(20).optional().default(""),
  email: z
    .union([z.literal(""), z.string().trim().email("Email inválido").max(100)])
    .optional()
    .default(""),
});

const hora = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Hora inválida (HH:mm)");
const zonaValida = (z_) => {
  try {
    new Intl.DateTimeFormat("en", { timeZone: z_ });
    return true;
  } catch {
    return false;
  }
};

export const configSchema = z
  .object({
    horario_apertura: hora,
    horario_cierre: hora,
    iva_porcentaje: z.coerce.number().min(0).max(100),
    moneda: z.string().trim().toUpperCase().min(2).max(10),
    zona_horaria: z
      .string()
      .trim()
      .refine(zonaValida, "Zona horaria no reconocida"),
    operacion_24h: z.boolean(),
  })
  .partial()
  .refine((d) => Object.keys(d).length > 0, "Nada para actualizar");
