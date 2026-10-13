// backend/src/services/turnos.service.js
import { withTransaction } from "../config/db.js";
import { AppError } from "../utils/AppError.js";
import { mapDb } from "../utils/mapDb.js";
import { turnoRepo } from "../repositories/turno.repository.js";
import { empresaGestionRepo } from "../repositories/empresa.repository.js";
import { ymdEnZona, localToUtc } from "../utils/tz.js";

const r2 = (n) => Math.round(n * 100) / 100;

function armarTotales(rows) {
  const t = { efectivo: 0, tarjeta: 0, qr: 0, transferencia: 0 };
  for (const x of rows) {
    const k = String(x.metodo_pago).toLowerCase();
    if (k in t) t[k] = r2(Number(x.total));
  }
  return { ...t, total: r2(t.efectivo + t.tarjeta + t.qr) };
}

async function resumen(empresaId, turno, conn) {
  const [totales, tickets] = await Promise.all([
    turnoRepo.totales(turno.id_turno, empresaId, conn),
    turnoRepo.tickets(turno.id_turno, empresaId, conn),
  ]);
  return {
    totales: armarTotales(totales),
    stats: {
      total: tickets.reduce((a, t) => a + t.cantidad, 0),
      porTipo: tickets,
    },
  };
}

// ---------------------------------------------------------------
// Estado del horario del negocio: calcula cuándo cierra, cuántos
// minutos faltan, y si el ingreso de vehículos está bloqueado.
//
// Reglas:
//  - operacion_24h = true  → nunca bloquea, sin aviso.
//  - horario_cierre = 00:00 → medianoche (fin del día).
//  - Si ya pasó la hora de cierre, busca el próximo cierre (mañana).
//    El frontend usa `minutosParaCierre < 0` para saber que ya cerró.
// ---------------------------------------------------------------
async function estadoHorario(empresaId) {
  const cfg = await empresaGestionRepo.config(empresaId);
  if (!cfg || cfg.operacion_24h) {
    return {
      operacion24h: true,
      cierraA: null,
      minutosParaCierre: null,
      bloqueado: false,
      horarioCierre: null,
      zonaHoraria: cfg?.zona_horaria ?? "America/Bogota",
    };
  }

  const tz = cfg.zona_horaria ?? "America/Bogota";
  const horario = cfg.horario_cierre ?? "22:00:00";
  const hhmm = String(horario).slice(0, 5);

  // Hoy en la zona de la empresa. El cierre del día puede ser "hoy a
  // las 22:00" (si aún no ha pasado) o "ayer a las 22:00" (si ya pasó).
  const hoy = ymdEnZona(tz); // YYYY-MM-DD
  const cierreHoy = localToUtc(tz, `${hoy} ${hhmm}:00`);
  const ahora = new Date();

  // Si ya pasó el cierre de hoy, usamos el de ayer para que
  // `minutosParaCierre` sea negativo (ya cerró) y no "faltan 23 horas".
  let cierraA = cierreHoy;
  if (cierreHoy.getTime() > ahora.getTime() + 60_000) {
    // Aún no ha llegado el cierre de hoy. ¿Ya cerró el de ayer?
    const [y, m, d] = hoy.split("-").map(Number);
    const ayer = new Date(Date.UTC(y, m - 1, d - 1)).toISOString().slice(0, 10);
    const cierreAyer = localToUtc(tz, `${ayer} ${hhmm}:00`);
    if (ahora.getTime() > cierreAyer.getTime()) {
      // Estamos entre el cierre de ayer y el cierre de hoy.
      // Ej: cierre 22:00, ahora son las 06:00. Aún no cerró "hoy",
      // pero ya cerró "ayer". El aviso debe aplicar al cierre de hoy.
      cierraA = cierreHoy;
    } else {
      // Estamos antes del cierre de ayer también (muy raro, cambio de día).
      cierraA = cierreAyer;
    }
  } else {
    // Ya pasó el cierre de hoy → referencia: cierre de ayer.
    const [y, m, d] = hoy.split("-").map(Number);
    const ayer = new Date(Date.UTC(y, m - 1, d - 1)).toISOString().slice(0, 10);
    const cierreAyer = localToUtc(tz, `${ayer} ${hhmm}:00`);
    cierraA = cierreAyer;
  }

  const minutosParaCierre = Math.round(
    (cierraA.getTime() - ahora.getTime()) / 60000,
  );
  const bloqueado = minutosParaCierre <= 0;

  return {
    operacion24h: false,
    cierraA: cierraA.toISOString(),
    minutosParaCierre,
    bloqueado,
    horarioCierre: hhmm,
    zonaHoraria: tz,
  };
}

export const turnosService = {
  actual: (u) => turnoRepo.abierto(u.empresaId, u.id),

  async resumen(u) {
    const turno = await turnoRepo.abierto(u.empresaId, u.id);
    if (!turno)
      throw AppError.conflict("No tienes un turno abierto", "NO_OPEN_SHIFT");
    return {
      turno,
      ...(await resumen(u.empresaId, turno)),
      horario: await estadoHorario(u.empresaId),
    };
  },

  // Se usa desde el frontend para saber el estado sin necesitar un turno
  // abierto (por ejemplo, el admin que no tiene turno pero quiere ver el
  // banner). No requiere turno.
  estadoHorario: (u) => estadoHorario(u.empresaId),

  async abrir(u, d) {
    const id = await withTransaction((conn) =>
      mapDb(() => turnoRepo.crear(conn, u.empresaId, u.id, d), {
        dup: "Ya tienes un turno abierto",
      }),
    );
    return { id_turno: id };
  },

  cerrar(u, d) {
    return withTransaction(async (conn) => {
      const turno = await turnoRepo.abierto(u.empresaId, u.id, conn, {
        forUpdate: true,
      });
      if (!turno)
        throw AppError.conflict("No tienes un turno abierto", "NO_OPEN_SHIFT");

      const { totales: ventas, stats } = await resumen(
        u.empresaId,
        turno,
        conn,
      );

      const base = Number(turno.base_inicial ?? 0);
      const esperado = {
        efectivo: r2(base + ventas.efectivo),
        tarjeta: r2(ventas.tarjeta),
        qr: r2(ventas.qr),
        transferencia: r2(ventas.transferencia),
        total: r2(base + ventas.total),
      };

      const conteo = {
        efectivo: d.total_efectivo,
        tarjeta: d.total_tarjeta,
        qr: d.total_qr,
      };
      conteo.total = r2(conteo.efectivo + conteo.tarjeta + conteo.qr);
      const diferencia = r2(conteo.total - esperado.total);

      await turnoRepo.cerrar(conn, turno.id_turno, {
        ...conteo,
        diferencia,
        observacion: d.observacion_cierre,
      });

      return {
        turno: {
          id_turno: turno.id_turno,
          usuario: u.nombre,
          fecha_apertura: turno.fecha_apertura,
        },
        base,
        esperado,
        ventas,
        conteo,
        diferencia,
        stats,
        observacion: d.observacion_cierre ?? null,
      };
    });
  },

  async detalle(u, id) {
    const t = await turnoRepo.porId(u.empresaId, id);
    if (!t || (u.rol !== "admin" && t.id_usuario !== u.id))
      throw AppError.notFound("Turno no encontrado");
    return { turno: t, ...(await resumen(u.empresaId, t)) };
  },
};
