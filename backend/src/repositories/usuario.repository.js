// backend/src/repositories/usuario.repository.js
import { pool } from "../config/db.js";

export async function findActivoByLogin(empresaId, login) {
  const [rows] = await pool.query(
    `SELECT id_usuario, id_empresa, nombre, rol, password_hash
       FROM usuarios WHERE id_empresa = ? AND usuario_login = ? AND activo = TRUE`,
    [empresaId, login],
  );
  return rows[0] ?? null;
}

export async function findActivoById(id, empresaId) {
  const [rows] = await pool.query(
    "SELECT id_usuario, nombre, rol FROM usuarios WHERE id_usuario = ? AND id_empresa = ? AND activo = TRUE",
    [id, empresaId],
  );
  return rows[0] ?? null;
}

export const touchUltimoAcceso = (id) =>
  pool.query(
    "UPDATE usuarios SET ultimo_acceso = UTC_TIMESTAMP() WHERE id_usuario = ?",
    [id],
  );
