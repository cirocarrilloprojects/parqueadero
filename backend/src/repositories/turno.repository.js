// backend/src/repositories/turno.repository.js
import { pool } from "../config/db.js";

export const turnoRepo = {
  async abierto(empresaId, usuarioId, conn = pool, { forUpdate = false } = {}) {
    const [r] = await conn.query(
      `SELECT id_turno, id_usuario, fecha_apertura, base_inicial, observacion_apertura
         FROM turnos WHERE id_empresa = ? AND id_usuario = ? AND estado = 'abierto' LIMIT 1${forUpdate ? " FOR UPDATE" : ""}`,
      [empresaId, usuarioId],
    );
    return r[0] ?? null;
  },
  async crear(conn, empresaId, usuarioId, d) {
    const [r] = await conn.query(
      `INSERT INTO turnos (id_empresa, id_usuario, fecha_apertura, base_inicial, observacion_apertura)
       VALUES (?, ?, UTC_TIMESTAMP(), ?, ?)`,
      [empresaId, usuarioId, d.base_inicial, d.observacion_apertura ?? null],
    );
    return r.insertId;
  },
  async cerrar(conn, id, d) {
    await conn.query(
      `UPDATE turnos SET fecha_cierre = UTC_TIMESTAMP(), total_efectivo = ?, total_tarjeta = ?, total_qr = ?,
              total_general = ?, diferencia = ?, observacion_cierre = ?, estado = 'cerrado'
        WHERE id_turno = ?`,
      [
        d.efectivo,
        d.tarjeta,
        d.qr,
        d.total,
        d.diferencia,
        d.observacion ?? null,
        id,
      ],
    );
  },
  async porId(empresaId, id) {
    const [r] = await pool.query(
      `SELECT t.*, u.nombre AS usuario, u.usuario_login
         FROM turnos t JOIN usuarios u ON u.id_usuario = t.id_usuario
        WHERE t.id_turno = ? AND t.id_empresa = ?`,
      [id, empresaId],
    );
    return r[0] ?? null;
  },
  async totales(turnoId, empresaId, conn = pool) {
    const [r] = await conn.query(
      `SELECT metodo_pago, SUM(monto) AS total FROM (
          SELECT metodo_pago, monto FROM pagos WHERE id_turno = ? AND id_empresa = ?
          UNION ALL
          SELECT metodo_pago, monto FROM mensualidades_pagos WHERE id_turno = ? AND id_empresa = ?
       ) x GROUP BY metodo_pago`,
      [turnoId, empresaId, turnoId, empresaId],
    );
    return r;
  },
  async tickets(turnoId, empresaId, conn = pool) {
    const [r] = await conn.query(
      `SELECT tv.codigo, tv.nombre, COUNT(DISTINCT m.id_movimiento) AS cantidad
         FROM pagos p
         JOIN movimientos m ON m.id_movimiento = p.id_movimiento
         JOIN vehiculos v ON v.id_vehiculo = m.id_vehiculo
         JOIN tipos_vehiculos tv ON tv.id_tipo = v.id_tipo
        WHERE p.id_turno = ? AND p.id_empresa = ?
        GROUP BY tv.id_tipo, tv.codigo, tv.nombre
        ORDER BY tv.nombre`,
      [turnoId, empresaId],
    );
    return r;
  },
};
