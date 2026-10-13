// backend/src/validators/tarifas.schema.js
import { z } from "zod";

const valor = z.coerce.number().min(0).max(99_999_999).default(0);
const paso = z.coerce.number().int().min(0).max(100_000).default(0);

export const tarifaSchema = z
  .object({
    id_tipo: z.coerce.number().int().positive("Selecciona un tipo de vehículo"),
    modo_cobro: z.enum(["minuto", "hora", "dia", "mixto"]).default("mixto"),
    valor_minuto: valor,
    valor_hora: valor,
    valor_dia_completo: valor,
    paso_minutos_a_horas: paso,
    paso_horas_a_dias: paso,
    redondeo_horas: z.enum(["arriba", "exacto"]).default("arriba"),
    redondeo_dias: z.enum(["arriba", "exacto"]).default("arriba"),
  })
  .superRefine((d, ctx) => {
    const requeridos = {
      minuto: ["valor_minuto"],
      hora: ["valor_hora"],
      dia: ["valor_dia_completo"],
      mixto: ["valor_minuto", "valor_hora", "valor_dia_completo"],
    }[d.modo_cobro];
    for (const k of requeridos)
      if (d[k] <= 0)
        ctx.addIssue({
          code: "custom",
          path: [k],
          message: "Debe ser mayor que 0",
        });
  });
