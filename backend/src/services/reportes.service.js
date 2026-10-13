// backend/src/services/reportes.service.js
import { AppError } from "../utils/AppError.js";
import { ymdEnZona, rangoDia } from "../utils/tz.js";
import { diasEntre } from "./mensualidad.rules.js";
import { reportesRepo as repo } from "../repositories/reportes.repository.js";
import { dashboardRepo } from "../repositories/dashboard.repository.js";
import { empresaGestionRepo } from "../repositories/empresa.repository.js";
import { libroReporte, libroTurnos } from "./reportes.excel.js";

const r2 = (n) => Math.round(n * 100) / 100;

async function contexto(u, q) {
  const cfg = (await empresaGestionRepo.config(u.empresaId)) ?? {};
  const tz = cfg.zona_horaria ?? "America/Bogota";
  const hoy = ymdEnZona(tz);
  const desde = q.desde ?? hoy;
  const hasta = q.hasta ?? hoy;
  if (desde > hasta)
    throw new AppError(
      "La fecha inicial no puede ser posterior a la final",
      400,
      "BAD_RANGE",
    );
  if (diasEntre(desde, hasta) > 366)
    throw new AppError("El rango máximo es de un año", 400, "BAD_RANGE");
  const [ini, fin] = rangoDia(tz, desde, hasta);
  return { tz, cfg, desde, hasta, ini, fin };
}

export const reportesService = {
  async resumen(u, q, ctx) {
    const c = ctx ?? (await contexto(u, q));
    const [pagos, tickets, porTipo] = await Promise.all([
      repo.pagosEnRango(u.empresaId, c.ini, c.fin),
      repo.contarTickets(u.empresaId, c.ini, c.fin),
      dashboardRepo.dentroPorTipo(u.empresaId),
    ]);

    let mov = 0,
      mens = 0;
    const dias = new Map(),
      metodos = new Map();
    for (const p of pagos) {
      const monto = Number(p.monto);
      p.origen === "parqueo" ? (mov += monto) : (mens += monto);
      const f = ymdEnZona(c.tz, new Date(p.fecha_pago)); // el día se decide en la zona de la empresa
      const d = dias.get(f) ?? {
        fecha: f,
        total: 0,
        efectivo: 0,
        tarjeta: 0,
        QR: 0,
        transferencia: 0,
      };
      d.total += monto;
      d[p.metodo_pago] = (d[p.metodo_pago] ?? 0) + monto;
      dias.set(f, d);
      metodos.set(p.metodo_pago, (metodos.get(p.metodo_pago) ?? 0) + monto);
    }
    const dentro = porTipo.reduce((a, t) => a + Number(t.cantidad), 0);
    const capacidad = porTipo.reduce((a, t) => a + t.capacidad, 0);
    return {
      kpis: {
        ingresos: r2(mov + mens),
        ingresosMov: r2(mov),
        ingresosMens: r2(mens),
        tickets,
        promedioTicket: tickets ? r2(mov / tickets) : 0,
        activos: dentro,
        ocupacion:
          capacidad > 0
            ? Math.min(100, Math.round((dentro / capacidad) * 100))
            : 0,
      },
      porDia: [...dias.values()]
        .sort((a, b) => a.fecha.localeCompare(b.fecha))
        .map((d) =>
          Object.fromEntries(
            Object.entries(d).map(([k, v]) => [
              k,
              typeof v === "number" ? r2(v) : v,
            ]),
          ),
        ),
      porMetodo: [...metodos].map(([metodo_pago, total]) => ({
        metodo_pago,
        total: r2(total),
      })),
    };
  },

  async movimientos(u, q) {
    const c = await contexto(u, q);
    const f = {
      ini: c.ini,
      fin: c.fin,
      tipo: q.tipo,
      estado: q.estado,
      placa: q.placa,
    };
    const [rows, total] = await Promise.all([
      repo.movimientos(u.empresaId, f, {
        limit: q.pageSize,
        offset: q.page * q.pageSize,
      }),
      repo.contarMovimientos(u.empresaId, f),
    ]);
    return { rows, paging: { page: q.page, pageSize: q.pageSize, total } };
  },
  async movimientosExport(u, q) {
    const c = await contexto(u, q);
    const rows = await repo.movimientos(
      u.empresaId,
      {
        ini: c.ini,
        fin: c.fin,
        tipo: q.tipo,
        estado: q.estado,
        placa: q.placa,
      },
      { limit: q.limit, offset: 0 },
    );
    return { rows, resumen: await this.resumen(u, q, c) };
  },
  async topPlacas(u, q) {
    const c = await contexto(u, q);
    return repo.topPlacas(u.empresaId, c.ini, c.fin, q.top);
  },
  async turnos(u, q) {
    const c = await contexto(u, q);
    return repo.turnos(u.empresaId, c.ini, c.fin, q.usuario);
  },

  async excel(u, q) {
    const c = await contexto(u, q);
    const [resumen, movimientos, mensualidades, empresa] = await Promise.all([
      this.resumen(u, q, c),
      repo.movimientos(
        u.empresaId,
        {
          ini: c.ini,
          fin: c.fin,
          tipo: q.tipo,
          estado: q.estado,
          placa: q.placa,
        },
        { limit: 5000, offset: 0 },
      ),
      repo.pagosMensualidad(u.empresaId, c.ini, c.fin),
      empresaGestionRepo.perfil(u.empresaId),
    ]);
    return {
      libro: libroReporte({
        empresa: { nombre: empresa.nombre, moneda: c.cfg.moneda ?? "COP" },
        tz: c.tz,
        desde: c.desde,
        hasta: c.hasta,
        resumen,
        movimientos,
        mensualidades,
      }),
      nombre: `reporte_${c.desde}_${c.hasta}.xlsx`,
    };
  },
  async excelTurnos(u, q) {
    const c = await contexto(u, q);
    return {
      libro: libroTurnos({
        tz: c.tz,
        turnos: await repo.turnos(u.empresaId, c.ini, c.fin, q.usuario),
      }),
      nombre: `cierres_turno_${c.desde}_${c.hasta}.xlsx`,
    };
  },
};
