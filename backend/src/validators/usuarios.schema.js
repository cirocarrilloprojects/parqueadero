// backend/src/validators/usuarios.schema.js
import { z } from "zod";

const PASSWORD_MIN = 6;
const login = z
  .string()
  .trim()
  .min(3)
  .max(50)
  .regex(/^[A-Za-z0-9]+$/, "Solo letras y números, sin espacios ni guiones");
const password = z
  .string()
  .min(
    PASSWORD_MIN,
    `La contraseña debe tener al menos ${PASSWORD_MIN} caracteres`,
  )
  .max(128);

export const usuarioCrearSchema = z.object({
  nombre: z.string().trim().min(1, "El nombre es obligatorio").max(100),
  usuario_login: login,
  password,
  rol: z.enum(["admin", "operador"]),
  activo: z.boolean().default(true),
});

export const usuarioActualizarSchema = z
  .object({
    nombre: z.string().trim().min(1).max(100),
    usuario_login: login,
    password,
    rol: z.enum(["admin", "operador"]),
    activo: z.boolean(),
  })
  .partial()
  .refine((d) => Object.keys(d).length > 0, "Nada para actualizar");
