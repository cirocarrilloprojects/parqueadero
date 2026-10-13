// backend/src/repositories/tarifa.repository.js
import { pool } from "../config/db.js";

export const tarifaRepo = {
  async vigentes(empresaId) {
    const [r] = await pool.query(
      `SELECT t.id_tarifa, t.id_tipo, t.valor_minuto, t.valor_hora, t.valor_dia_completo, t.modo_cobro,
              t.paso_minutos_a_horas, t.paso_horas_a_dias, t.redondeo_horas, t.redondeo_dias,
              t.vigente_desde, tv.nombre AS tipo_nombre, tv.codigo AS tipo_codigo
         FROM tarifas t JOIN tipos_vehiculos tv ON tv.id_tipo = t.id_tipo
        WHERE t.id_empresa = ? AND t.activa = TRUE
        ORDER BY tv.nombre`,
      [empresaId],
    );
    return r;
  },

  // Se llama dentro de una transacción: cierra la vigencia actual e inserta la nueva.
  async reemplazar(conn, empresaId, t) {
    await conn.query(
      "UPDATE tarifas SET activa = FALSE, vigente_hasta = UTC_TIMESTAMP() WHERE id_empresa = ? AND id_tipo = ? AND activa = TRUE",
      [empresaId, t.id_tipo],
    );
    const [r] = await conn.query(
      `INSERT INTO tarifas (id_empresa, id_tipo, valor_hora, valor_minuto, valor_dia_completo, vigente_desde,
                            activa, modo_cobro, paso_minutos_a_horas, paso_horas_a_dias, redondeo_horas, redondeo_dias)
       VALUES (?, ?, ?, ?, ?, UTC_TIMESTAMP(), TRUE, ?, ?, ?, ?, ?)`,
      [
        empresaId,
        t.id_tipo,
        t.valor_hora,
        t.valor_minuto,
        t.valor_dia_completo,
        t.modo_cobro,
        t.paso_minutos_a_horas,
        t.paso_horas_a_dias,
        t.redondeo_horas,
        t.redondeo_dias,
      ],
    );
    return r.insertId;
  },
};
