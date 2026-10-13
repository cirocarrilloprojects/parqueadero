// backend/src/repositories/usuarioGestion.repository.js
import { pool } from "../config/db.js";

const EDITABLES = new Set([
  "nombre",
  "usuario_login",
  "rol",
  "activo",
  "password_hash",
]);

export const usuarioGestionRepo = {
  async listar(empresaId) {
    const [r] = await pool.query(
      "SELECT id_usuario, nombre, usuario_login, rol, activo, ultimo_acceso FROM usuarios WHERE id_empresa = ? ORDER BY id_usuario DESC",
      [empresaId],
    );
    return r;
  },
  async porId(empresaId, id) {
    const [r] = await pool.query(
      "SELECT id_usuario, nombre, usuario_login, rol, activo FROM usuarios WHERE id_usuario = ? AND id_empresa = ?",
      [id, empresaId],
    );
    return r[0] ?? null;
  },
  async adminsActivos(empresaId) {
    const [[r]] = await pool.query(
      "SELECT COUNT(*) AS n FROM usuarios WHERE id_empresa = ? AND rol = 'admin' AND activo = TRUE",
      [empresaId],
    );
    return r.n;
  },
  async crear(empresaId, d) {
    const [r] = await pool.query(
      "INSERT INTO usuarios (id_empresa, nombre, usuario_login, password_hash, rol, activo) VALUES (?, ?, ?, ?, ?, ?)",
      [empresaId, d.nombre, d.usuario_login, d.password_hash, d.rol, d.activo],
    );
    return r.insertId;
  },
  // Los nombres de columna salen de una lista blanca, nunca del cliente.
  async actualizar(empresaId, id, campos) {
    const keys = Object.keys(campos).filter(
      (k) => EDITABLES.has(k) && campos[k] !== undefined,
    );
    if (!keys.length) return 0;
    const [r] = await pool.query(
      `UPDATE usuarios SET ${keys.map((k) => `${k} = ?`).join(", ")} WHERE id_empresa = ? AND id_usuario = ?`,
      [...keys.map((k) => campos[k]), empresaId, id],
    );
    return r.affectedRows;
  },
};
