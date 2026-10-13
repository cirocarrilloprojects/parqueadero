// backend/src/validators/auth.schema.js
import { z } from "zod";

export const loginSchema = {
  body: z.object({
    nit: z.string().trim().min(3).max(20),
    // Mismo patrón que tu validateLogin original, pero declarativo
    usuario: z
      .string()
      .trim()
      .min(3)
      .max(50)
      .regex(
        /^[a-zA-Z0-9_.-]+$/,
        "Solo letras, números, guion, punto y guion bajo",
      ),
    password: z.string().min(6).max(128), // tope 128: bcrypt procesa máx. 72 bytes; evita DoS con claves gigantes
  }),
};
