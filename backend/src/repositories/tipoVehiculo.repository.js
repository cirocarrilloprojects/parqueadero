// backend/src/repositories/tipoVehiculo.repository.js
import { pool } from "../config/db.js";

export const tipoRepo = {
  async activos(empresaId) {
    const [r] = await pool.query(
      "SELECT id_tipo, nombre, codigo FROM tipos_vehiculos WHERE id_empresa = ? AND activo = TRUE ORDER BY nombre",
      [empresaId],
    );
    return r;
  },

  // NUEVO: usado por movimientos.service (ingreso) para validar el tipo dentro
  // de la transacción y con el filtro multi-empresa.
  async findActivo(empresaId, id, conn = pool) {
    const [r] = await conn.query(
      "SELECT id_tipo, nombre, codigo FROM tipos_vehiculos WHERE id_tipo = ? AND id_empresa = ? AND activo = TRUE",
      [id, empresaId],
    );
    return r[0] ?? null;
  },

  async listar(empresaId) {
    const [r] = await pool.query(
      `SELECT tv.id_tipo, tv.nombre, tv.codigo, tv.capacidad, tv.activo, tv.fecha_creacion,
              (SELECT COUNT(*) FROM vehiculos v WHERE v.id_tipo = tv.id_tipo AND v.id_empresa = tv.id_empresa) AS total_vehiculos,
              (SELECT COUNT(*) FROM tarifas t WHERE t.id_tipo = tv.id_tipo AND t.id_empresa = tv.id_empresa AND t.activa = TRUE) AS tiene_tarifa_activa
         FROM tipos_vehiculos tv
        WHERE tv.id_empresa = ?
        ORDER BY tv.fecha_creacion`,
      [empresaId],
    );
    return r;
  },

  async porId(empresaId, id) {
    const [r] = await pool.query(
      "SELECT id_tipo, nombre, codigo, capacidad, activo, fecha_creacion FROM tipos_vehiculos WHERE id_tipo = ? AND id_empresa = ?",
      [id, empresaId],
    );
    return r[0] ?? null;
  },

  async crear(empresaId, d) {
    const [r] = await pool.query(
      "INSERT INTO tipos_vehiculos (id_empresa, nombre, codigo, capacidad, activo) VALUES (?, ?, ?, ?, ?)",
      [empresaId, d.nombre, d.codigo, d.capacidad, d.activo],
    );
    return r.insertId;
  },

  async actualizar(empresaId, id, d) {
    const [r] = await pool.query(
      "UPDATE tipos_vehiculos SET nombre = ?, codigo = ?, capacidad = ?, activo = ? WHERE id_tipo = ? AND id_empresa = ?",
      [d.nombre, d.codigo, d.capacidad, d.activo, id, empresaId],
    );
    return r.affectedRows;
  },

  async usos(empresaId, id) {
    const [[v]] = await pool.query(
      "SELECT COUNT(*) AS n FROM vehiculos WHERE id_tipo = ? AND id_empresa = ?",
      [id, empresaId],
    );
    const [[t]] = await pool.query(
      "SELECT COUNT(*) AS n FROM tarifas WHERE id_tipo = ? AND id_empresa = ?",
      [id, empresaId],
    );
    return { vehiculos: v.n, tarifas: t.n };
  },

  async eliminar(empresaId, id) {
    const [r] = await pool.query(
      "DELETE FROM tipos_vehiculos WHERE id_tipo = ? AND id_empresa = ?",
      [id, empresaId],
    );
    return r.affectedRows;
  },
};
