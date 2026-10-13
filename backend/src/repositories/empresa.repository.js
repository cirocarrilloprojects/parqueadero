// backend/src/repositories/empresa.repository.js
import { pool } from "../config/db.js";

const CONFIG_COLS = [
  "horario_apertura",
  "horario_cierre",
  "iva_porcentaje",
  "moneda",
  "zona_horaria",
  "operacion_24h",
];

export const empresaGestionRepo = {
  async perfil(empresaId) {
    const [r] = await pool.query(
      `SELECT e.id_empresa, e.nombre, e.nit, e.direccion, e.telefono, e.email, e.plan,
              EXISTS (SELECT 1 FROM empresa_logos l WHERE l.id_empresa = e.id_empresa) AS tiene_logo
         FROM empresas e WHERE e.id_empresa = ? AND e.activa = TRUE`,
      [empresaId],
    );
    return r[0] ?? null;
  },
  async actualizarPerfil(empresaId, d) {
    await pool.query(
      "UPDATE empresas SET nombre = ?, nit = ?, direccion = ?, telefono = ?, email = ? WHERE id_empresa = ?",
      [d.nombre, d.nit, d.direccion, d.telefono, d.email, empresaId],
    );
  },
  async config(empresaId) {
    const [r] = await pool.query(
      `SELECT ${CONFIG_COLS.join(", ")} FROM configuracion_empresa WHERE id_empresa = ?`,
      [empresaId],
    );
    return r[0] ?? null;
  },
  async actualizarConfig(empresaId, d) {
    const keys = CONFIG_COLS.filter((k) => d[k] !== undefined);
    if (!keys.length) return;
    await pool.query(
      `UPDATE configuracion_empresa SET ${keys.map((k) => `${k} = ?`).join(", ")} WHERE id_empresa = ?`,
      [...keys.map((k) => d[k]), empresaId],
    );
  },
  async logo(empresaId) {
    const [r] = await pool.query(
      "SELECT mime, datos FROM empresa_logos WHERE id_empresa = ?",
      [empresaId],
    );
    return r[0] ?? null;
  },
  async guardarLogo(empresaId, mime, datos) {
    await pool.query(
      `INSERT INTO empresa_logos (id_empresa, mime, datos) VALUES (?, ?, ?) AS n
       ON DUPLICATE KEY UPDATE mime = n.mime, datos = n.datos`,
      [empresaId, mime, datos],
    );
  },
};

// Repositorio = ÚNICA capa que escribe SQL. No contiene reglas de negocio, solo acceso a datos.
export async function findActivaByNit(nit) {
  const [rows] = await pool.query(
    "SELECT id_empresa, nombre, nit, plan FROM empresas WHERE nit = ? AND activa = TRUE",
    [nit], // parametrizado: el NIT jamás se concatena al SQL
  );
  return rows[0] ?? null;
}

// NUEVO: usado por /auth/me. Solo tenemos el id_empresa del JWT,
// pero necesitamos nombre y NIT reales para armar la sesión.
export async function findById(id) {
  const [rows] = await pool.query(
    "SELECT id_empresa, nombre, nit, plan FROM empresas WHERE id_empresa = ? AND activa = TRUE",
    [id],
  );
  return rows[0] ?? null;
}

export async function findConfig(empresaId) {
  const [rows] = await pool.query(
    `SELECT zona_horaria, moneda, operacion_24h, horario_apertura, horario_cierre, iva_porcentaje
       FROM configuracion_empresa WHERE id_empresa = ?`,
    [empresaId],
  );
  return rows[0] ?? null;
}
