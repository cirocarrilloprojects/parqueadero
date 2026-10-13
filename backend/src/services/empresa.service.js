// backend/src/services/empresa.service.js
import { AppError } from "../utils/AppError.js";
import { mapDb } from "../utils/mapDb.js";
import { empresaGestionRepo as repo } from "../repositories/empresa.repository.js";

function detectarMime(b) {
  if (b.length < 4) return null;
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47)
    return "image/png";
  if (b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38)
    return "image/gif";
  return null;
}

export const empresaService = {
  async perfil(u) {
    const e = await repo.perfil(u.empresaId);
    if (!e) throw new AppError("Empresa no encontrada", 404, "NOT_FOUND");
    return { ...e, tiene_logo: !!e.tiene_logo };
  },
  async actualizarPerfil(u, d) {
    await mapDb(() => repo.actualizarPerfil(u.empresaId, d), {
      dup: "El NIT ya está registrado",
    });
  },
  async config(u) {
    const c = await repo.config(u.empresaId);
    if (!c) throw new AppError("Configuración no encontrada", 404, "NOT_FOUND");
    return { ...c, operacion_24h: !!c.operacion_24h };
  },
  actualizarConfig: (u, d) => repo.actualizarConfig(u.empresaId, d),

  logo: (u) => repo.logo(u.empresaId),
  async subirLogo(u, file) {
    if (!file?.buffer)
      throw new AppError("Archivo no recibido", 400, "NO_FILE");
    const mime = detectarMime(file.buffer);
    if (!mime)
      throw new AppError(
        "Tipo de archivo no permitido. Usa PNG, JPG o GIF.",
        400,
        "BAD_FILE",
      );
    await repo.guardarLogo(u.empresaId, mime, file.buffer);
  },
};
