// backend/src/repositories/loginAttempt.repository.js
import { pool } from "../config/db.js";

export const register = (empresaId, login, exitoso, ip) =>
  pool.query(
    "INSERT INTO login_attempts (id_empresa, usuario_login, exitoso, ip_address) VALUES (?,?,?,?)",
    [empresaId, login, exitoso, ip],
  );

// Cuenta fallos recientes por usuario O por IP (misma regla que tu original, con índice compuesto)
export async function countRecentFailures(empresaId, login, ip, minutes) {
  const [rows] = await pool.query(
    `SELECT COUNT(*) AS n FROM login_attempts
      WHERE id_empresa = ? AND exitoso = FALSE
        AND fecha_intento > UTC_TIMESTAMP() - INTERVAL ? MINUTE
        AND (usuario_login = ? OR ip_address = ?)`,
    [empresaId, minutes, login, ip],
  );
  return rows[0].n;
}
