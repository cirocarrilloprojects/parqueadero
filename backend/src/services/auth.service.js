// backend/src/services/auth.service.js
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { AppError } from "../utils/AppError.js";
import * as empresaRepo from "../repositories/empresa.repository.js";
import * as usuarioRepo from "../repositories/usuario.repository.js";
import * as attemptRepo from "../repositories/loginAttempt.repository.js";

const MAX_FALLOS = 5;
const VENTANA_MIN = 15;

// Hash "señuelo": si el usuario no existe igual ejecutamos bcrypt.compare, así el tiempo de
// respuesta es similar y un atacante no puede deducir qué usuarios existen midiendo latencia.
const DUMMY_HASH = bcrypt.hashSync("contraseña-señuelo", 12);

// Mensaje ÚNICO para cualquier fallo de credenciales (no revela qué dato falló)
const credencialesInvalidas = () =>
  AppError.unauthorized("Credenciales inválidas", "INVALID_CREDENTIALS");

// Arma lo que el frontend necesita saber de la sesión (también lo usa GET /auth/me)
async function buildSession(user, empresa) {
  const config = await empresaRepo.findConfig(empresa.id_empresa);
  return {
    id: user.id_usuario,
    nombre: user.nombre,
    rol: user.rol,
    empresa: {
      id: empresa.id_empresa,
      nombre: empresa.nombre,
      nit: empresa.nit,
    },
    config,
  };
}

export async function login({ nit, usuario, password, ip }) {
  const empresa = await empresaRepo.findActivaByNit(nit);
  if (!empresa) {
    await bcrypt.compare(password, DUMMY_HASH);
    throw credencialesInvalidas();
  }

  const fallos = await attemptRepo.countRecentFailures(
    empresa.id_empresa,
    usuario,
    ip,
    VENTANA_MIN,
  );
  if (fallos >= MAX_FALLOS) {
    throw AppError.tooMany(
      `Demasiados intentos fallidos. Intenta de nuevo en ${VENTANA_MIN} minutos.`,
    );
  }

  const user = await usuarioRepo.findActivoByLogin(empresa.id_empresa, usuario);
  const ok = await bcrypt.compare(password, user?.password_hash ?? DUMMY_HASH);
  if (!user || !ok) {
    await attemptRepo.register(empresa.id_empresa, usuario, false, ip);
    throw credencialesInvalidas();
  }

  await attemptRepo.register(empresa.id_empresa, usuario, true, ip);
  await usuarioRepo.touchUltimoAcceso(user.id_usuario);

  // JWT mínimo: sub = id de usuario, emp = empresa, rol, nom = nombre.
  // HS256 es el algoritmo por defecto de sign(); `algorithms` SOLO va en verify().
  const token = jwt.sign(
    {
      sub: user.id_usuario,
      emp: empresa.id_empresa,
      rol: user.rol,
      nom: user.nombre,
    },
    env.JWT_SECRET,
    { expiresIn: `${env.JWT_EXPIRES_HOURS}h` },
  );

  return { token, session: await buildSession(user, empresa) };
}

export async function getSession({ id, empresaId }) {
  const [user, empresa] = await Promise.all([
    usuarioRepo.findActivoById(id, empresaId),
    empresaRepo.findById(empresaId),
  ]);
  if (!user) throw AppError.unauthorized("Usuario inactivo o inexistente");
  if (!empresa) throw AppError.unauthorized("Empresa inactiva");
  return buildSession(user, empresa);
}
