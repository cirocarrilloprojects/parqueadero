// backend/src/services/dashboard.service.js
import { dashboardRepo } from "../repositories/dashboard.repository.js";
import { empresaGestionRepo } from "../repositories/empresa.repository.js";
import { ymdEnZona, rangoDia } from "../utils/tz.js";

export const dashboardService = {
  async stats(u, { page, pageSize }) {
    const cfg = await empresaGestionRepo.config(u.empresaId);
    const tz = cfg?.zona_horaria ?? "America/Bogota";
    const [desde, hasta] = rangoDia(tz, ymdEnZona(tz)); // "hoy" según la zona de la empresa

    const [porTipo, ingresosHoy, act] = await Promise.all([
      dashboardRepo.dentroPorTipo(u.empresaId),
      dashboardRepo.ingresos(u.empresaId, desde, hasta),
      dashboardRepo.actividad(u.empresaId, pageSize, page * pageSize),
    ]);

    const dentro = porTipo.reduce((a, t) => a + t.cantidad, 0);
    const capacidad = porTipo.reduce((a, t) => a + t.capacidad, 0); // ocupación desde tipos_vehiculos.capacidad
    return {
      porTipo: porTipo.map((t) => ({ ...t, cantidad: Number(t.cantidad) })),
      ingresosHoy,
      ocupacion:
        capacidad > 0
          ? Math.min(100, Math.round((dentro / capacidad) * 100))
          : 0,
      actividad: act.rows,
      paging: {
        page,
        pageSize,
        total: act.total,
        hasNext: (page + 1) * pageSize < act.total,
      },
    };
  },
};
