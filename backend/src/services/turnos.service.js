// backend/src/services/turnos.service.js
import { withTransaction } from "../config/db.js";
import { AppError } from "../utils/AppError.js";
import { mapDb } from "../utils/mapDb.js";
import { turnoRepo } from "../repositories/turno.repository.js";

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

export const turnosService = {
  actual: (u) => turnoRepo.abierto(u.empresaId, u.id),

  async resumen(u) {
    const turno = await turnoRepo.abierto(u.empresaId, u.id);
    if (!turno)
      throw AppError.conflict("No tienes un turno abierto", "NO_OPEN_SHIFT");
    return { turno, ...(await resumen(u.empresaId, turno)) };
  },

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

      const { totales: esperado, stats } = await resumen(
        u.empresaId,
        turno,
        conn,
      );
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
        base: Number(turno.base_inicial),
        esperado,
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
