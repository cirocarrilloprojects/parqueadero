// backend/src/repositories/movimiento.repository.js
import { pool } from "../config/db.js";

// IMPORTANTE (arregla S4): CADA consulta lleva `id_empresa = ?`. Es el "candado" multi-empresa.

export async function findTarifaActiva(empresaId, tipoId, conn = pool) {
  const [rows] = await conn.query(
    "SELECT * FROM tarifas WHERE id_empresa = ? AND id_tipo = ? AND activa = TRUE",
    [empresaId, tipoId],
  );
  return rows[0] ?? null;
}

export async function findVehiculoByPlaca(empresaId, placa, conn = pool) {
  const [rows] = await conn.query(
    "SELECT id_vehiculo, id_tipo FROM vehiculos WHERE id_empresa = ? AND placa = ?",
    [empresaId, placa],
  );
  return rows[0] ?? null;
}

export async function insertVehiculo(empresaId, placa, tipoId, conn) {
  const [r] = await conn.query(
    "INSERT INTO vehiculos (id_empresa, id_tipo, placa) VALUES (?,?,?)",
    [empresaId, tipoId, placa],
  );
  return r.insertId;
}

export const updateTipoVehiculo = (vehiculoId, tipoId, conn) =>
  conn.query("UPDATE vehiculos SET id_tipo = ? WHERE id_vehiculo = ?", [
    tipoId,
    vehiculoId,
  ]);

export async function insertMovimiento(
  { empresaId, vehiculoId, tarifaId, usuarioId },
  conn,
) {
  const [r] = await conn.query(
    `INSERT INTO movimientos (id_empresa, id_vehiculo, id_tarifa, id_usuario_entrada)
     VALUES (?,?,?,?)`,
    [empresaId, vehiculoId, tarifaId, usuarioId],
  );
  return r.insertId;
}

// Movimiento ACTIVO de una placa, con su tarifa congelada (A1).
// `forUpdate` bloquea la fila hasta el COMMIT: dos cajeros no pueden cobrar el mismo vehículo a la vez.
export async function findActivoByPlaca(
  empresaId,
  placa,
  conn = pool,
  { forUpdate = false } = {},
) {
  const [rows] = await conn.query(
    `SELECT m.id_movimiento, m.fecha_entrada, m.id_tarifa,
            v.placa, tv.nombre AS tipo, tv.codigo AS tipo_codigo,
            t.modo_cobro, t.valor_minuto, t.valor_hora, t.valor_dia_completo,
            t.paso_minutos_a_horas, t.paso_horas_a_dias, t.redondeo_horas, t.redondeo_dias
       FROM movimientos m
       JOIN vehiculos v        ON v.id_vehiculo = m.id_vehiculo
       JOIN tipos_vehiculos tv ON tv.id_tipo    = v.id_tipo
       JOIN tarifas t          ON t.id_tarifa   = m.id_tarifa
      WHERE m.id_empresa = ? AND v.placa = ? AND m.estado = 'activo'
      ${forUpdate ? "FOR UPDATE" : ""}`,
    [empresaId, placa], // la cláusula FOR UPDATE es constante del código, no entrada del usuario
  );
  return rows[0] ?? null;
}

export async function findTurnoAbierto(usuarioId, empresaId, conn = pool) {
  const [rows] = await conn.query(
    `SELECT id_turno FROM turnos WHERE id_usuario = ? AND id_empresa = ? AND estado = 'abierto'`,
    [usuarioId, empresaId],
  );
  return rows[0] ?? null;
}

// Hora actual según LA BASE DE DATOS (única fuente de verdad del tiempo; evita desfases de reloj del servidor web)
export async function ahoraUtc(conn = pool) {
  const [rows] = await conn.query("SELECT UTC_TIMESTAMP() AS ahora");
  return rows[0].ahora;
}

export const finalizar = (
  { movimientoId, empresaId, total, usuarioId },
  conn,
) =>
  conn.query(
    `UPDATE movimientos
        SET fecha_salida = UTC_TIMESTAMP(), total_a_pagar = ?, estado = 'finalizado', id_usuario_salida = ?
      WHERE id_movimiento = ? AND id_empresa = ?`,
    [total, usuarioId, movimientoId, empresaId],
  );

// INSERT múltiple: `VALUES ?` con un arreglo de arreglos es el patrón parametrizado de mysql2
export const insertPagos = (rows, conn) =>
  conn.query(
    `INSERT INTO pagos (id_empresa, id_movimiento, id_turno, id_usuario, metodo_pago, monto, monto_recibido, referencia)
     VALUES ?`,
    [rows],
  );

// Corrige S4: ahora el detalle SOLO devuelve movimientos de la empresa del usuario
export async function findDetalle(id, empresaId) {
  const [rows] = await pool.query(
    `SELECT m.id_movimiento, m.fecha_entrada, m.fecha_salida, m.total_a_pagar, m.estado,
            v.placa, tv.nombre AS tipo
       FROM movimientos m
       JOIN vehiculos v        ON v.id_vehiculo = m.id_vehiculo
       JOIN tipos_vehiculos tv ON tv.id_tipo    = v.id_tipo
      WHERE m.id_movimiento = ? AND m.id_empresa = ?`,
    [id, empresaId],
  );
  return rows[0] ?? null;
}
