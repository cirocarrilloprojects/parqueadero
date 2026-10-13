// backend/src/validators/reportes.schema.js
import { z } from "zod";

const ymd = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida")
  .refine((v) => !Number.isNaN(Date.parse(v)), "Fecha inválida");
const vacioAUndef = (v) => (v === "" ? undefined : v);

export const reporteQuerySchema = z.object({
  desde: ymd.optional(),
  hasta: ymd.optional(),
  tipo: z
    .union([
      z.literal(""),
      z
        .string()
        .trim()
        .toLowerCase()
        .regex(/^[a-z0-9_]{1,20}$/),
    ])
    .optional()
    .transform(vacioAUndef),
  estado: z
    .enum(["", "activo", "finalizado"])
    .optional()
    .transform(vacioAUndef),
  placa: z
    .string()
    .trim()
    .toUpperCase()
    .max(10)
    .optional()
    .transform(vacioAUndef),
  usuario: z.string().trim().max(50).optional().transform(vacioAUndef),
  page: z.coerce.number().int().min(0).max(100000).default(0),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  limit: z.coerce.number().int().min(1).max(5000).default(1000),
  top: z.coerce.number().int().min(1).max(50).default(10),
});
