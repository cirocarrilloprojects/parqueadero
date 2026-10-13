// backend/src/repositories/mensualidad.repository.js
import { pool } from "../config/db.js";
import { likeContiene } from "../utils/like.js";

const COLS = `m.id_mensualidad, m.titular_nombre, m.titular_documento, m.titular_telefono, m.titular_email, m.valor_mensual,
  DATE_FORMAT(m.fecha_inicio, '%Y-%m-%d') AS fecha_inicio, DATE_FORMAT(m.fecha_fin, '%Y-%m-%d') AS fecha_fin,
  m.auto_renovar, m.estado, m.observaciones, v.placa, v.id_tipo, tv.nombre AS tipo,
  DATE_FORMAT(p.last_paid_until, '%Y-%m-%d') AS last_paid_until`;
// El primer ? del FROM es el empresaId de la subconsulta.
const FROM = `FROM mensualidades m
  JOIN vehiculos v ON v.id_vehiculo = m.id_vehiculo
  JOIN tipos_vehiculos tv ON tv.id_tipo = v.id_tipo
  LEFT JOIN (SELECT id_mensualidad, MAX(periodo_hasta) AS last_paid_until
               FROM mensualidades_pagos WHERE id_empresa = ? GROUP BY id_mensualidad) p
         ON p.id_mensualidad = m.id_mensualidad`;

function filtros(empresaId, { q, estado, hoy }) {
  const where = ["m.id_empresa = ?"];
  const params = [empresaId];
  if (estado === "vencida") {
    // Vencida = pago pendiente según el calendario (no la columna `estado`, que nadie actualiza).
    where.push(
      "m.estado <> 'cancelada'",
      "(m.fecha_fin IS NULL OR m.fecha_fin >= ?)",
      "COALESCE(DATE_ADD(p.last_paid_until, INTERVAL 1 DAY), m.fecha_inicio) <= ?",
    );
    params.push(hoy, hoy);
  } else if (estado) {
    where.push("m.estado = ?");
    params.push(estado);
  }
  if (q) {
    where.push(
      "(v.placa LIKE ? OR m.titular_nombre LIKE ? OR m.titular_documento LIKE ?)",
    );
    const l = likeContiene(q);
    params.push(l, l, l);
  }
  return { sql: where.join(" AND "), params };
}

export const mensualidadRepo = {
  async listar(empresaId, f, { limit, offset }) {
    const { sql, params } = filtros(empresaId, f);
    const [rows] = await pool.query(
      `SELECT ${COLS} ${FROM} WHERE ${sql} ORDER BY m.fecha_creacion DESC LIMIT ? OFFSET ?`,
      [empresaId, ...params, limit, offset],
    );
    const [[c]] = await pool.query(
      `SELECT COUNT(*) AS n ${FROM} WHERE ${sql}`,
      [empresaId, ...params],
    );
    return { rows, total: c.n };
  },
  async porId(empresaId, id, conn = pool) {
    const [r] = await conn.query(
      `SELECT ${COLS} ${FROM} WHERE m.id_mensualidad = ? AND m.id_empresa = ?`,
      [empresaId, id, empresaId],
    );
    return r[0] ?? null;
  },
  async bloquear(conn, empresaId, id) {
    const [r] = await conn.query(
      "SELECT id_mensualidad FROM mensualidades WHERE id_mensualidad = ? AND id_empresa = ? FOR UPDATE",
      [id, empresaId],
    );
    return r.length > 0;
  },
  async porPlaca(conn, empresaId, placa) {
    const [r] = await conn.query(
      "SELECT id_vehiculo FROM vehiculos WHERE placa = ? AND id_empresa = ?",
      [placa, empresaId],
    );
    return r[0] ?? null;
  },
  async crearVehiculo(conn, empresaId, placa, idTipo) {
    const [r] = await conn.query(
      "INSERT INTO vehiculos (id_empresa, placa, id_tipo, color, modelo) VALUES (?, ?, ?, '', '')",
      [empresaId, placa, idTipo],
    );
    return r.insertId;
  },
  async crear(conn, empresaId, idVehiculo, d) {
    const [r] = await conn.query(
      `INSERT INTO mensualidades (id_empresa, id_vehiculo, titular_nombre, titular_documento, titular_telefono, titular_email,
                                  valor_mensual, fecha_inicio, fecha_fin, auto_renovar, estado, observaciones, fecha_creacion)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'activa', ?, UTC_TIMESTAMP())`,
      [
        empresaId,
        idVehiculo,
        d.titular_nombre,
        d.titular_documento || null,
        d.titular_telefono || null,
        d.titular_email || null,
        d.valor_mensual,
        d.fecha_inicio,
        d.fecha_fin,
        d.auto_renovar ? 1 : 0,
        d.observaciones,
      ],
    );
    return r.insertId;
  },
  async actualizar(conn, empresaId, id, idVehiculo, d) {
    await conn.query(
      `UPDATE mensualidades SET id_vehiculo = ?, titular_nombre = ?, titular_documento = ?, titular_telefono = ?, titular_email = ?,
              valor_mensual = ?, fecha_inicio = ?, fecha_fin = ?, auto_renovar = ?, estado = COALESCE(?, estado), observaciones = ?
        WHERE id_mensualidad = ? AND id_empresa = ?`,
      [
        idVehiculo,
        d.titular_nombre,
        d.titular_documento || null,
        d.titular_telefono || null,
        d.titular_email || null,
        d.valor_mensual,
        d.fecha_inicio,
        d.fecha_fin,
        d.auto_renovar ? 1 : 0,
        d.estado ?? null,
        d.observaciones,
        id,
        empresaId,
      ],
    );
  },
  async pagos(empresaId, id) {
    const [r] = await pool.query(
      `SELECT mp.id_pago_mensualidad AS id_pago, mp.fecha_pago, DATE_FORMAT(mp.periodo_desde, '%Y-%m-%d') AS periodo_desde,
              DATE_FORMAT(mp.periodo_hasta, '%Y-%m-%d') AS periodo_hasta, mp.metodo_pago, mp.monto, mp.referencia_pago, u.nombre AS usuario
         FROM mensualidades_pagos mp JOIN usuarios u ON u.id_usuario = mp.id_usuario
        WHERE mp.id_empresa = ? AND mp.id_mensualidad = ? ORDER BY mp.fecha_pago DESC`,
      [empresaId, id],
    );
    return r;
  },
  async insertarPago(conn, d) {
    const [r] = await conn.query(
      `INSERT INTO mensualidades_pagos (id_empresa, id_mensualidad, id_turno, fecha_pago, periodo_desde, periodo_hasta, metodo_pago, monto, referencia_pago, id_usuario)
       VALUES (?, ?, ?, UTC_TIMESTAMP(), ?, ?, ?, ?, ?, ?)`,
      [
        d.empresaId,
        d.id,
        d.turnoId,
        d.periodo_desde,
        d.periodo_hasta,
        d.metodo_pago,
        d.monto,
        d.referencia_pago ?? null,
        d.usuarioId,
      ],
    );
    return r.insertId;
  },
  async pagoRecibo(empresaId, id, idPago) {
    const [r] = await pool.query(
      `SELECT mp.fecha_pago, DATE_FORMAT(mp.periodo_desde, '%Y-%m-%d') AS periodo_desde, DATE_FORMAT(mp.periodo_hasta, '%Y-%m-%d') AS periodo_hasta,
              mp.metodo_pago, mp.monto, mp.referencia_pago, m.id_mensualidad, m.titular_nombre, v.placa, u.nombre AS atendido
         FROM mensualidades_pagos mp
         JOIN mensualidades m ON m.id_mensualidad = mp.id_mensualidad AND m.id_empresa = mp.id_empresa
         JOIN vehiculos v ON v.id_vehiculo = m.id_vehiculo
         JOIN usuarios u ON u.id_usuario = mp.id_usuario
        WHERE mp.id_pago_mensualidad = ? AND mp.id_mensualidad = ? AND mp.id_empresa = ?`,
      [idPago, id, empresaId],
    );
    return r[0] ?? null;
  },
};
