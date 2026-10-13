// backend/src/services/usuarios.service.js
import bcrypt from "bcryptjs";
import { AppError } from "../utils/AppError.js";
import { mapDb } from "../utils/mapDb.js";
import { usuarioGestionRepo as repo } from "../repositories/usuarioGestion.repository.js";
import { invalidarSesion } from "../middlewares/sessionGuard.js";

const COST = 12;
const DUP = "Ese nombre de usuario ya existe en esta empresa";

async function exigir(u, id) {
  const t = await repo.porId(u.empresaId, id);
  if (!t) throw new AppError("Usuario no encontrado", 404, "NOT_FOUND");
  return t;
}

export const usuariosService = {
  listar: (u) => repo.listar(u.empresaId),

  async crear(u, { password, ...d }) {
    const password_hash = await bcrypt.hash(password, COST);
    const id = await mapDb(
      () => repo.crear(u.empresaId, { ...d, password_hash }),
      { dup: DUP },
    );
    return { id };
  },

  async actualizar(u, id, { password, admin_password: _ignore, ...d }) {
    const t = await exigir(u, id);
    const seraAdminActivo =
      (d.rol ?? t.rol) === "admin" && (d.activo ?? !!t.activo);

    if (id === u.id && !seraAdminActivo)
      throw new AppError(
        "No puedes desactivarte ni quitarte el rol de administrador",
        400,
        "SELF_LOCKOUT",
      );
    if (
      t.rol === "admin" &&
      t.activo &&
      !seraAdminActivo &&
      (await repo.adminsActivos(u.empresaId)) <= 1
    )
      throw new AppError(
        "Debe quedar al menos un administrador activo",
        409,
        "LAST_ADMIN",
      );

    const campos = { ...d };
    if (password) campos.password_hash = await bcrypt.hash(password, COST);
    await mapDb(() => repo.actualizar(u.empresaId, id, campos), { dup: DUP });

    invalidarSesion(id);
  },

  desactivar(u, id) {
    return this.actualizar(u, id, { activo: false });
  },
};
