// backend/src/middlewares/sessionGuard.js
import { pool } from "../config/db.js";

const TTL_MS = 30_000;
const cache = new Map(); // id_usuario -> { exp, estado }

// Llamar tras editar o desactivar un usuario para que el cambio sea inmediato.
export const invalidarSesion = (idUsuario) => cache.delete(Number(idUsuario));

export async function sesionVigente(user) {
  const hit = cache.get(user.id);
  if (hit && hit.exp > Date.now()) return hit.estado;

  const [rows] = await pool.query(
    `SELECT u.rol, u.activo, e.activa AS empresa_activa
       FROM usuarios u JOIN empresas e ON e.id_empresa = u.id_empresa
      WHERE u.id_usuario = ? AND u.id_empresa = ?`,
    [user.id, user.empresaId],
  );
  const r = rows[0];
  const estado = r && r.activo && r.empresa_activa ? { rol: r.rol } : null;

  if (cache.size > 5000) cache.clear(); // tope de seguridad
  cache.set(user.id, { exp: Date.now() + TTL_MS, estado });
  return estado;
}
