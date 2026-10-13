// backend/src/repositories/dashboard.repository.js
import { pool } from "../config/db.js";

export const dashboardRepo = {
  // Todos los tipos activos (incluso con 0 dentro): el frontend ya no está fijo a carro/moto/bici.
  async dentroPorTipo(empresaId) {
    const [r] = await pool.query(
      `SELECT tv.id_tipo, tv.nombre, tv.codigo, tv.capacidad, COUNT(m.id_movimiento) AS cantidad
         FROM tipos_vehiculos tv
         LEFT JOIN vehiculos v ON v.id_tipo = tv.id_tipo AND v.id_empresa = tv.id_empresa
         LEFT JOIN movimientos m ON m.id_vehiculo = v.id_vehiculo AND m.estado = 'activo'
        WHERE tv.id_empresa = ? AND tv.activo = TRUE
        GROUP BY tv.id_tipo, tv.nombre, tv.codigo, tv.capacidad
        ORDER BY tv.nombre`,
      [empresaId],
    );
    return r;
  },
  async ingresos(empresaId, desde, hasta) {
    const [[r]] = await pool.query(
      `SELECT COALESCE(SUM(total_a_pagar), 0) AS total FROM movimientos
        WHERE id_empresa = ? AND estado = 'finalizado' AND fecha_salida >= ? AND fecha_salida < ?`,
      [empresaId, desde, hasta],
    );
    return Number(r.total);
  },
  async actividad(empresaId, limit, offset) {
    const [rows] = await pool.query(
      `SELECT m.id_movimiento AS id, v.placa, tv.nombre AS tipo, m.fecha_entrada AS entrada, m.estado
         FROM movimientos m
         JOIN vehiculos v ON v.id_vehiculo = m.id_vehiculo
         JOIN tipos_vehiculos tv ON tv.id_tipo = v.id_tipo
        WHERE m.id_empresa = ?
        ORDER BY (m.estado = 'activo') DESC, m.fecha_entrada DESC
        LIMIT ? OFFSET ?`,
      [empresaId, limit, offset],
    );
    const [[c]] = await pool.query(
      "SELECT COUNT(*) AS total FROM movimientos WHERE id_empresa = ?",
      [empresaId],
    );
    return { rows, total: c.total };
  },
};
