// backend/src/repositories/vehiculo.repository.js
import { pool } from "../config/db.js";

export const vehiculoRepo = {
  async listar(empresaId) {
    const [r] = await pool.query(
      `SELECT v.id_vehiculo, v.placa, v.id_tipo, tv.nombre AS tipo, tv.codigo AS tipo_codigo,
              v.color, v.modelo, v.fecha_registro,
              IF(EXISTS (SELECT 1 FROM movimientos m WHERE m.id_vehiculo = v.id_vehiculo AND m.estado = 'activo'),
                 'activo', 'inactivo') AS estado
         FROM vehiculos v
         JOIN tipos_vehiculos tv ON tv.id_tipo = v.id_tipo
        WHERE v.id_empresa = ?
        ORDER BY v.fecha_registro DESC`,
      [empresaId],
    );
    return r;
  },
  async porId(empresaId, id) {
    const [r] = await pool.query(
      `SELECT v.id_vehiculo, v.placa, v.id_tipo, tv.nombre AS tipo, v.color, v.modelo, v.fecha_registro
         FROM vehiculos v JOIN tipos_vehiculos tv ON tv.id_tipo = v.id_tipo
        WHERE v.id_vehiculo = ? AND v.id_empresa = ?`,
      [id, empresaId],
    );
    return r[0] ?? null;
  },
  async historial(empresaId, id) {
    // pagos.monto ya es lo aplicado; monto_recibido permite derivar el vuelto sin prorrateos.
    const [r] = await pool.query(
      `SELECT m.id_movimiento, m.fecha_entrada, m.fecha_salida, m.total_a_pagar, m.estado,
              COALESCE(SUM(p.monto), 0) AS total_pagado,
              COALESCE(SUM(p.monto_recibido), 0) AS total_recibido,
              COUNT(p.id_pago) AS pagos
         FROM movimientos m
         LEFT JOIN pagos p ON p.id_movimiento = m.id_movimiento
        WHERE m.id_vehiculo = ? AND m.id_empresa = ?
        GROUP BY m.id_movimiento
        ORDER BY m.fecha_entrada DESC`,
      [id, empresaId],
    );
    return r;
  },
  async estaDentro(id) {
    const [[r]] = await pool.query(
      "SELECT COUNT(*) AS n FROM movimientos WHERE id_vehiculo = ? AND estado = 'activo'",
      [id],
    );
    return r.n > 0;
  },
  async crear(empresaId, d) {
    const [r] = await pool.query(
      "INSERT INTO vehiculos (id_empresa, placa, id_tipo, color, modelo) VALUES (?, ?, ?, ?, ?)",
      [empresaId, d.placa, d.id_tipo, d.color, d.modelo],
    );
    return r.insertId;
  },
  async actualizar(empresaId, id, d) {
    await pool.query(
      "UPDATE vehiculos SET placa = ?, id_tipo = ?, color = ?, modelo = ? WHERE id_vehiculo = ? AND id_empresa = ?",
      [d.placa, d.id_tipo, d.color, d.modelo, id, empresaId],
    );
  },
  async eliminar(empresaId, id) {
    await pool.query(
      "DELETE FROM vehiculos WHERE id_vehiculo = ? AND id_empresa = ?",
      [id, empresaId],
    );
  },
};
