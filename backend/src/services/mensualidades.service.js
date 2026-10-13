// backend/src/services/mensualidades.service.js
import { withTransaction } from "../config/db.js";
import { AppError } from "../utils/AppError.js";
import { ymdEnZona } from "../utils/tz.js";
import { mensualidadRepo as repo } from "../repositories/mensualidad.repository.js";
import { empresaGestionRepo } from "../repositories/empresa.repository.js";
import { tipoRepo } from "../repositories/tipoVehiculo.repository.js";
import { turnoRepo } from "../repositories/turno.repository.js";
import { estadoCobro, sugerirPago } from "./mensualidad.rules.js";

const noEncontrada = () =>
  new AppError("Mensualidad no encontrada", 404, "NOT_FOUND");
const hoyEmpresa = async (empresaId) =>
  ymdEnZona(
    (await empresaGestionRepo.config(empresaId))?.zona_horaria ??
      "America/Bogota",
  );
const decorar = (r, hoy) => ({
  ...r,
  valor_mensual: Number(r.valor_mensual),
  auto_renovar: !!r.auto_renovar,
  ...estadoCobro(r, hoy),
});

async function resolverVehiculo(conn, empresaId, placa, idTipo) {
  const v = await repo.porPlaca(conn, empresaId, placa);
  if (v) return v.id_vehiculo;
  if (!idTipo)
    throw new AppError(
      "Selecciona el tipo de vehículo: la placa es nueva",
      400,
      "TYPE_REQUIRED",
    );
  const t = await tipoRepo.porId(empresaId, idTipo);
  if (!t || !t.activo)
    throw new AppError(
      "Tipo de vehículo no válido o inactivo",
      400,
      "INVALID_TYPE",
    );
  return repo.crearVehiculo(conn, empresaId, placa, idTipo);
}

export const mensualidadesService = {
  async listar(u, q) {
    const hoy = await hoyEmpresa(u.empresaId);
    const { rows, total } = await repo.listar(
      u.empresaId,
      { q: q.q, estado: q.estado, hoy },
      { limit: q.pageSize, offset: (q.page - 1) * q.pageSize },
    );
    return { rows: rows.map((r) => decorar(r, hoy)), total };
  },
  async obtener(u, id) {
    const m = await repo.porId(u.empresaId, id);
    if (!m) throw noEncontrada();
    return decorar(m, await hoyEmpresa(u.empresaId));
  },
  async crear(u, d) {
    const id = await withTransaction(async (conn) =>
      repo.crear(
        conn,
        u.empresaId,
        await resolverVehiculo(conn, u.empresaId, d.placa, d.id_tipo),
        d,
      ),
    );
    return { id_mensualidad: id };
  },
  async actualizar(u, id, d) {
    await withTransaction(async (conn) => {
      if (!(await repo.bloquear(conn, u.empresaId, id))) throw noEncontrada();
      await repo.actualizar(
        conn,
        u.empresaId,
        id,
        await resolverVehiculo(conn, u.empresaId, d.placa, d.id_tipo),
        d,
      );
    });
  },
  pagos: async (u, id) => (
    await mensualidadesService.obtener(u, id),
    repo.pagos(u.empresaId, id)
  ),

  async sugerencia(u, id, meses) {
    const hoy = await hoyEmpresa(u.empresaId);
    const m = await repo.porId(u.empresaId, id);
    if (!m) throw noEncontrada();
    const s = sugerirPago(m, hoy, meses);
    const due_status = estadoCobro(m, hoy).due_status;
    return s
      ? { ...s, valor_mensual: Number(m.valor_mensual), due_status }
      : { inactivo: true, due_status, valor_mensual: Number(m.valor_mensual) };
  },

  async pagar(u, id, d) {
    const hoy = await hoyEmpresa(u.empresaId);
    return withTransaction(async (conn) => {
      if (!(await repo.bloquear(conn, u.empresaId, id))) throw noEncontrada(); // serializa pagos concurrentes de la misma mensualidad
      const m = await repo.porId(u.empresaId, id, conn);
      const turno = await turnoRepo.abierto(u.empresaId, u.id, conn);
      if (!turno)
        throw new AppError(
          "Debe abrir un turno antes de registrar pagos de mensualidad",
          409,
          "NO_OPEN_SHIFT",
        );
      const s = sugerirPago(m, hoy, d.meses);
      if (!s)
        throw new AppError("La mensualidad está inactiva", 409, "INACTIVE");
      const idPago = await repo.insertarPago(conn, {
        empresaId: u.empresaId,
        id,
        turnoId: turno.id_turno,
        usuarioId: u.id,
        ...d,
        periodo_desde: s.periodo_desde,
        periodo_hasta: s.periodo_hasta,
      });
      return {
        id_pago: idPago,
        periodo_desde: s.periodo_desde,
        periodo_hasta: s.periodo_hasta,
      };
    });
  },

  async recibo(u, id, idPago) {
    const p = await repo.pagoRecibo(u.empresaId, id, idPago);
    if (!p) throw new AppError("Pago no encontrado", 404, "NOT_FOUND");
    const e = await empresaGestionRepo.perfil(u.empresaId);
    return {
      empresa: {
        nombre: e.nombre,
        nit: e.nit,
        direccion: e.direccion,
        telefono: e.telefono,
        tiene_logo: !!e.tiene_logo,
      },
      mensualidad: {
        id: p.id_mensualidad,
        placa: p.placa,
        titular: p.titular_nombre,
      },
      pago: {
        fecha_pago: p.fecha_pago,
        periodo_desde: p.periodo_desde,
        periodo_hasta: p.periodo_hasta,
        metodo_pago: p.metodo_pago,
        monto: Number(p.monto),
        referencia: p.referencia_pago,
      },
      atendido: p.atendido,
    };
  },
};
