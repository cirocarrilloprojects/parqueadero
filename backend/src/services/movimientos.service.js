// backend/src/services/movimientos.service.js
import { withTransaction } from "../config/db.js";
import { AppError } from "../utils/AppError.js";
import { calcularTotal } from "./pricing.service.js";
import * as movRepo from "../repositories/movimiento.repository.js";
import { tipoRepo } from "../repositories/tipoVehiculo.repository.js";
import { empresaGestionRepo } from "../repositories/empresa.repository.js";
import { ymdEnZona, localToUtc } from "../utils/tz.js";

const aCentavos = (n) => Math.round(Number(n) * 100);
const minutosEntre = (desde, hasta) => Math.floor((hasta - desde) / 60000);

const tarifaParaTicket = (m) => ({
  valor_minuto: m.valor_minuto,
  valor_hora: m.valor_hora,
  valor_dia_completo: m.valor_dia_completo,
});

// ---------------------------------------------------------------
// Verifica si el negocio está cerrado AHORA para la empresa.
// Devuelve { bloqueado, minutosParaCierre, cierraA }.
// Solo se usa para bloquear el INGRESO de nuevos vehículos.
// Las salidas siempre se permiten.
// ---------------------------------------------------------------
async function negocioCerradoAhora(empresaId) {
  const cfg = await empresaGestionRepo.config(empresaId);
  if (!cfg || cfg.operacion_24h) return { bloqueado: false };

  const tz = cfg.zona_horaria ?? "America/Bogota";
  const hhmm = String(cfg.horario_cierre ?? "22:00:00").slice(0, 5);
  const hoy = ymdEnZona(tz);
  const ahora = new Date();

  const cierreHoy = localToUtc(tz, `${hoy} ${hhmm}:00`);

  // Si el cierre de hoy aún no ha llegado (más de 1 min de margen),
  // no está bloqueado. Si ya pasó, está bloqueado.
  // El caso "estoy entre el cierre de ayer y el de hoy" no bloquea
  // porque el cierre de hoy todavía no ha ocurrido.
  const bloqueado = ahora.getTime() >= cierreHoy.getTime();
  const minutosParaCierre = Math.round(
    (cierreHoy.getTime() - ahora.getTime()) / 60000,
  );

  return { bloqueado, minutosParaCierre, cierraA: cierreHoy.toISOString() };
}

/** INGRESO: todo en una transacción para que vehículo + movimiento sean atómicos. */
export async function registrarIngreso({
  empresaId,
  usuarioId,
  rol,
  placa,
  tipoId,
}) {
  // Bloqueo por horario: solo operadores, y solo si el negocio ya cerró.
  // El admin nunca se bloquea (revisa reportes a cualquier hora).
  if (rol !== "admin") {
    const { bloqueado } = await negocioCerradoAhora(empresaId);
    if (bloqueado) {
      throw AppError.conflict(
        "El parqueadero está cerrado. No se pueden registrar nuevos ingresos.",
        "AFTER_HOURS",
      );
    }
  }

  return withTransaction(async (conn) => {
    const tipo = await tipoRepo.findActivo(empresaId, tipoId, conn);
    if (!tipo)
      throw AppError.badRequest("Tipo de vehículo no válido o inactivo");

    const tarifa = await movRepo.findTarifaActiva(empresaId, tipoId, conn);
    if (!tarifa)
      throw AppError.badRequest(
        "No hay tarifa activa para este tipo",
        "NO_TARIFA",
      );

    let vehiculo = await movRepo.findVehiculoByPlaca(empresaId, placa, conn);
    let vehiculoId = vehiculo?.id_vehiculo;
    if (!vehiculo) {
      vehiculoId = await movRepo.insertVehiculo(empresaId, placa, tipoId, conn);
    } else if (vehiculo.id_tipo !== tipoId) {
      await movRepo.updateTipoVehiculo(vehiculoId, tipoId, conn);
    }

    try {
      const movimientoId = await movRepo.insertMovimiento(
        { empresaId, vehiculoId, tarifaId: tarifa.id_tarifa, usuarioId },
        conn,
      );
      const ahora = await movRepo.ahoraUtc(conn);
      return {
        movimientoId,
        placa,
        tipo: tipo.nombre,
        tipo_codigo: tipo.codigo,
        fechaEntrada: ahora,
        tarifa: tarifaParaTicket(tarifa),
      };
    } catch (err) {
      if (err.code === "ER_DUP_ENTRY")
        throw AppError.conflict("El vehículo ya está dentro", "ALREADY_INSIDE");
      throw err;
    }
  });
}

/** PREVISUALIZACIÓN: calcula sin modificar nada (solo lectura). */
export async function calcularSalida({ empresaId, placa }) {
  const mov = await movRepo.findActivoByPlaca(empresaId, placa);
  if (!mov)
    throw AppError.notFound(
      `La placa ${placa} no tiene ingreso activo. Verifica la placa.`,
      "NO_ACTIVE_MOVEMENT",
    );

  const ahora = await movRepo.ahoraUtc();
  const detalle = calcularTotal(minutosEntre(mov.fecha_entrada, ahora), mov);
  return {
    movimientoId: mov.id_movimiento,
    placa: mov.placa,
    tipo: mov.tipo,
    tipo_codigo: mov.tipo_codigo,
    fechaEntrada: mov.fecha_entrada,
    fechaSalida: ahora,
    detalleTiempo: {
      dias: detalle.dias,
      horas: detalle.horas,
      minutos: detalle.minutos,
    },
    tarifa: tarifaParaTicket(mov),
    total: detalle.total,
  };
}

/**
 * CONFIRMACIÓN: finaliza el movimiento y registra pagos.
 * NO se bloquea por horario: las salidas siempre se permiten.
 */
export async function confirmarSalida({ empresaId, usuarioId, placa, pagos }) {
  return withTransaction(async (conn) => {
    const turno = await movRepo.findTurnoAbierto(usuarioId, empresaId, conn);
    if (!turno)
      throw AppError.conflict(
        "Debes abrir un turno antes de cobrar",
        "TURNO_CERRADO",
      );

    const mov = await movRepo.findActivoByPlaca(empresaId, placa, conn, {
      forUpdate: true,
    });
    if (!mov)
      throw AppError.notFound(
        "Movimiento no encontrado o ya finalizado",
        "NO_ACTIVE_MOVEMENT",
      );

    const ahora = await movRepo.ahoraUtc(conn);
    const detalle = calcularTotal(minutosEntre(mov.fecha_entrada, ahora), mov);

    const totalC = aCentavos(detalle.total);
    const recibidoC = pagos.reduce((s, p) => s + aCentavos(p.monto), 0);
    if (recibidoC < totalC) {
      throw AppError.badRequest(
        "El monto recibido es menor al total a pagar",
        "UNDERPAID",
      );
    }
    const vueltoC = recibidoC - totalC;
    const efectivoC = pagos
      .filter((p) => p.metodo_pago === "efectivo")
      .reduce((s, p) => s + aCentavos(p.monto), 0);
    if (vueltoC > efectivoC) {
      throw AppError.badRequest(
        "El vuelto solo puede darse del efectivo recibido",
        "CHANGE_NOT_CASH",
      );
    }

    let vueltoPendiente = vueltoC;
    const filas = [];
    for (const p of pagos) {
      const recibido = aCentavos(p.monto);
      let aplicado = recibido;
      if (p.metodo_pago === "efectivo" && vueltoPendiente > 0) {
        const descuento = Math.min(vueltoPendiente, recibido);
        aplicado = recibido - descuento;
        vueltoPendiente -= descuento;
      }
      if (aplicado > 0) {
        filas.push([
          empresaId,
          mov.id_movimiento,
          turno.id_turno,
          usuarioId,
          p.metodo_pago,
          aplicado / 100,
          recibido / 100,
          p.referencia ?? null,
        ]);
      }
    }

    await movRepo.finalizar(
      {
        movimientoId: mov.id_movimiento,
        empresaId,
        total: detalle.total,
        usuarioId,
      },
      conn,
    );
    await movRepo.insertPagos(filas, conn);

    return {
      movimientoId: mov.id_movimiento,
      placa: mov.placa,
      tipo: mov.tipo,
      fechaEntrada: mov.fecha_entrada,
      fechaSalida: ahora,
      detalleTiempo: {
        dias: detalle.dias,
        horas: detalle.horas,
        minutos: detalle.minutos,
      },
      tarifa: tarifaParaTicket(mov),
      total: detalle.total,
      recibido: recibidoC / 100,
      vuelto: vueltoC / 100,
      pagosList: pagos,
    };
  });
}

export async function getDetalle({ id, empresaId }) {
  const m = await movRepo.findDetalle(id, empresaId);
  if (!m) throw AppError.notFound("Movimiento no encontrado");
  return m;
}
