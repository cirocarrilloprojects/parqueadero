// backend/src/repositories/reportes.repository.js
import { pool } from "../config/db.js";
import { likeContiene } from "../utils/like.js";

function filtrosMov(empresaId, { ini, fin, tipo, estado, placa }) {
  const where = ["m.id_empresa = ?"];
  const params = [empresaId];
  if (estado === "activo")
    where.push(
      "m.estado = 'activo'",
      "m.fecha_entrada >= ?",
      "m.fecha_entrada < ?",
    );
  else
    where.push(
      "m.estado = 'finalizado'",
      "m.fecha_salida >= ?",
      "m.fecha_salida < ?",
    );
  params.push(ini, fin);
  if (tipo) {
    where.push("tv.codigo = ?");
    params.push(tipo);
  }
  if (placa) {
    where.push("v.placa LIKE ?");
    params.push(likeContiene(placa));
  }
  return { sql: where.join(" AND "), params };
}
const JOINS = `FROM movimientos m JOIN vehiculos v ON v.id_vehiculo = m.id_vehiculo JOIN tipos_vehiculos tv ON tv.id_tipo = v.id_tipo`;

export const reportesRepo = {
  async pagosEnRango(empresaId, ini, fin) {
    const [r] = await pool.query(
      `SELECT fecha_pago, metodo_pago, monto, 'parqueo' AS origen FROM pagos WHERE id_empresa = ? AND fecha_pago >= ? AND fecha_pago < ?
       UNION ALL
       SELECT fecha_pago, metodo_pago, monto, 'mensualidad' AS origen FROM mensualidades_pagos WHERE id_empresa = ? AND fecha_pago >= ? AND fecha_pago < ?`,
      [empresaId, ini, fin, empresaId, ini, fin],
    );
    return r;
  },
  async contarTickets(empresaId, ini, fin) {
    const [[r]] = await pool.query(
      "SELECT COUNT(*) AS n FROM movimientos WHERE id_empresa = ? AND estado = 'finalizado' AND fecha_salida >= ? AND fecha_salida < ?",
      [empresaId, ini, fin],
    );
    return r.n;
  },
  async movimientos(empresaId, f, { limit, offset }) {
    const { sql, params } = filtrosMov(empresaId, f);
    const [r] = await pool.query(
      `SELECT m.id_movimiento, v.placa, tv.nombre AS tipo, m.fecha_entrada, m.fecha_salida, m.estado, m.total_a_pagar,
              COALESCE(SUM(CASE WHEN p.metodo_pago = 'efectivo' THEN p.monto END), 0) AS efectivo,
              COALESCE(SUM(CASE WHEN p.metodo_pago = 'tarjeta' THEN p.monto END), 0) AS tarjeta,
              COALESCE(SUM(CASE WHEN p.metodo_pago = 'QR' THEN p.monto END), 0) AS qr
         ${JOINS} LEFT JOIN pagos p ON p.id_movimiento = m.id_movimiento
        WHERE ${sql}
        GROUP BY m.id_movimiento, v.placa, tv.nombre, m.fecha_entrada, m.fecha_salida, m.estado, m.total_a_pagar
        ORDER BY COALESCE(m.fecha_salida, m.fecha_entrada) DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    );
    return r;
  },
  async contarMovimientos(empresaId, f) {
    const { sql, params } = filtrosMov(empresaId, f);
    const [[r]] = await pool.query(
      `SELECT COUNT(*) AS n ${JOINS} WHERE ${sql}`,
      params,
    );
    return r.n;
  },
  async topPlacas(empresaId, ini, fin, top) {
    const [r] = await pool.query(
      `SELECT v.placa, MAX(tv.nombre) AS tipo, COUNT(*) AS visitas, COALESCE(SUM(m.total_a_pagar), 0) AS total
         ${JOINS} WHERE m.id_empresa = ? AND m.estado = 'finalizado' AND m.fecha_salida >= ? AND m.fecha_salida < ?
        GROUP BY v.placa ORDER BY visitas DESC, total DESC LIMIT ?`,
      [empresaId, ini, fin, top],
    );
    return r;
  },
  async turnos(empresaId, ini, fin, usuario) {
    const where = [
      "t.id_empresa = ?",
      "COALESCE(t.fecha_cierre, t.fecha_apertura) >= ?",
      "COALESCE(t.fecha_cierre, t.fecha_apertura) < ?",
    ];
    const params = [empresaId, ini, fin];
    if (usuario) {
      where.push("u.usuario_login LIKE ?");
      params.push(likeContiene(usuario));
    }
    const [r] = await pool.query(
      `SELECT t.id_turno, t.fecha_apertura, t.fecha_cierre, t.base_inicial, t.total_efectivo, t.total_tarjeta, t.total_qr,
              t.total_general, t.diferencia, t.estado, u.nombre AS usuario, u.usuario_login
         FROM turnos t JOIN usuarios u ON u.id_usuario = t.id_usuario
        WHERE ${where.join(" AND ")} ORDER BY COALESCE(t.fecha_cierre, t.fecha_apertura) DESC`,
      params,
    );
    return r;
  },
  async pagosMensualidad(empresaId, ini, fin) {
    const [r] = await pool.query(
      `SELECT mp.fecha_pago, mp.metodo_pago, mp.monto, v.placa, mp.id_mensualidad, m.titular_nombre,
              DATE_FORMAT(mp.periodo_desde, '%Y-%m-%d') AS periodo_desde, DATE_FORMAT(mp.periodo_hasta, '%Y-%m-%d') AS periodo_hasta
         FROM mensualidades_pagos mp
         JOIN mensualidades m ON m.id_mensualidad = mp.id_mensualidad AND m.id_empresa = mp.id_empresa
         JOIN vehiculos v ON v.id_vehiculo = m.id_vehiculo
        WHERE mp.id_empresa = ? AND mp.fecha_pago >= ? AND mp.fecha_pago < ? ORDER BY mp.fecha_pago`,
      [empresaId, ini, fin],
    );
    return r;
  },

  // NUEVO: totales por trabajador en el rango. Agrupa pagos de parqueo y
  // mensualidades por id_usuario, desglosado por método.
  async porUsuario(empresaId, ini, fin) {
    const [r] = await pool.query(
      `SELECT u.id_usuario, u.nombre, u.usuario_login, u.rol,
              SUM(x.efectivo)      AS efectivo,
              SUM(x.tarjeta)       AS tarjeta,
              SUM(x.qr)            AS qr,
              SUM(x.transferencia) AS transferencia,
              SUM(x.monto)         AS total,
              COUNT(DISTINCT x.id_movimiento) AS tickets
         FROM (
           SELECT p.id_usuario, p.metodo_pago, p.monto, p.id_movimiento,
                  CASE WHEN p.metodo_pago = 'efectivo'      THEN p.monto ELSE 0 END AS efectivo,
                  CASE WHEN p.metodo_pago = 'tarjeta'       THEN p.monto ELSE 0 END AS tarjeta,
                  CASE WHEN p.metodo_pago = 'QR'            THEN p.monto ELSE 0 END AS qr,
                  CASE WHEN p.metodo_pago = 'transferencia' THEN p.monto ELSE 0 END AS transferencia
             FROM pagos p
            WHERE p.id_empresa = ? AND p.fecha_pago >= ? AND p.fecha_pago < ?
           UNION ALL
           SELECT mp.id_usuario, mp.metodo_pago, mp.monto, NULL AS id_movimiento,
                  CASE WHEN mp.metodo_pago = 'efectivo'      THEN mp.monto ELSE 0 END AS efectivo,
                  CASE WHEN mp.metodo_pago = 'tarjeta'       THEN mp.monto ELSE 0 END AS tarjeta,
                  CASE WHEN mp.metodo_pago = 'QR'            THEN mp.monto ELSE 0 END AS qr,
                  CASE WHEN mp.metodo_pago = 'transferencia' THEN mp.monto ELSE 0 END AS transferencia
             FROM mensualidades_pagos mp
            WHERE mp.id_empresa = ? AND mp.fecha_pago >= ? AND mp.fecha_pago < ?
         ) x
         JOIN usuarios u ON u.id_usuario = x.id_usuario
        GROUP BY u.id_usuario, u.nombre, u.usuario_login, u.rol
        ORDER BY total DESC`,
      [empresaId, ini, fin, empresaId, ini, fin],
    );
    return r;
  },
};
