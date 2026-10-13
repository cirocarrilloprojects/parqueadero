// backend/src/repositories/ticket.repository.js
import { pool } from "../config/db.js";

export const ticketRepo = {
  async movimiento(empresaId, id) {
    const [r] = await pool.query(
      `SELECT m.id_movimiento, m.estado, m.fecha_entrada, m.fecha_salida, m.total_a_pagar,
              v.placa, tv.nombre AS tipo, tv.codigo AS tipo_codigo,
              t.valor_minuto, t.valor_hora, t.valor_dia_completo, t.modo_cobro,
              ue.nombre AS atendido_entrada, us.nombre AS atendido_salida,
              TIMESTAMPDIFF(MINUTE, m.fecha_entrada, COALESCE(m.fecha_salida, UTC_TIMESTAMP())) AS minutos
         FROM movimientos m
         JOIN vehiculos v ON v.id_vehiculo = m.id_vehiculo
         JOIN tipos_vehiculos tv ON tv.id_tipo = v.id_tipo
         JOIN tarifas t ON t.id_tarifa = m.id_tarifa
         JOIN usuarios ue ON ue.id_usuario = m.id_usuario_entrada
         LEFT JOIN usuarios us ON us.id_usuario = m.id_usuario_salida
        WHERE m.id_movimiento = ? AND m.id_empresa = ?`,
      [id, empresaId],
    );
    return r[0] ?? null;
  },
  async pagos(empresaId, id) {
    const [r] = await pool.query(
      "SELECT metodo_pago, monto, monto_recibido FROM pagos WHERE id_movimiento = ? AND id_empresa = ? ORDER BY id_pago",
      [id, empresaId],
    );
    return r;
  },
};
