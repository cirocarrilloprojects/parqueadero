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

// Confirmación del admin para acciones sensibles. Se valida en requirePassword,
// aquí solo se permite el paso sin rechazar por "campo desconocido".
const admin_password = z.string().min(1).max(128).optional();

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
    admin_password,
  })
  .partial()
  .refine((d) => Object.keys(d).length > 0, "Nada para actualizar");

// Body de rutas protegidas por requirePassword que no llevan otros campos
// (p. ej. DELETE /usuarios/:id). Deja pasar admin_password opcional.
export const adminPasswordBodySchema = z.object({
  admin_password,
});
