// backend/src/validators/mensualidades.schema.js
import { z } from "zod";

const ymd = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida")
  .refine((v) => !Number.isNaN(Date.parse(v)), "Fecha inválida");
const METODOS = ["efectivo", "tarjeta", "QR", "transferencia"];

export const mensualidadSchema = z
  .object({
    placa: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z0-9-]{1,10}$/, "Placa inválida"),
    id_tipo: z.coerce.number().int().positive().optional(),
    titular_nombre: z
      .string()
      .trim()
      .min(1, "El titular es obligatorio")
      .max(120),
    titular_documento: z.string().trim().max(40).optional().default(""),
    titular_telefono: z.string().trim().max(30).optional().default(""),
    titular_email: z
      .union([
        z.literal(""),
        z.string().trim().email("Email inválido").max(120),
      ])
      .optional()
      .default(""),
    valor_mensual: z.coerce
      .number()
      .positive("El valor mensual debe ser mayor que 0")
      .max(9_999_999_999),
    fecha_inicio: ymd,
    fecha_fin: z
      .union([ymd, z.literal(""), z.null()])
      .optional()
      .transform((v) => v || null),
    auto_renovar: z.boolean().default(true),
    estado: z.enum(["activa", "vencida", "cancelada"]).optional(),
    observaciones: z.string().trim().max(255).optional().default(""),
  })
  .refine((d) => !d.fecha_fin || d.fecha_fin >= d.fecha_inicio, {
    message: "La fecha fin no puede ser anterior al inicio",
    path: ["fecha_fin"],
  });

export const mensualidadesQuerySchema = z.object({
  q: z.string().trim().max(60).default(""),
  estado: z.enum(["", "activa", "vencida", "cancelada"]).default(""),
  page: z.coerce.number().int().min(1).max(100000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
});

export const sugerenciaQuerySchema = z.object({
  meses: z.coerce.number().int().min(1).max(60).optional(),
});

// El periodo lo calcula el servidor a partir del último pago: el cliente solo elige cuántos meses.
export const pagoMensualidadSchema = z.object({
  meses: z.coerce.number().int().min(1).max(60).default(1),
  metodo_pago: z.enum(METODOS),
  monto: z.coerce
    .number()
    .positive("El monto debe ser mayor que 0")
    .max(9_999_999_999),
  referencia_pago: z.string().trim().max(100).optional(),
});

export const pagoParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
  idPago: z.coerce.number().int().positive(),
});
