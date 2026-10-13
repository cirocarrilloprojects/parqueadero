// backend/src/services/tickets.service.js
import { AppError } from "../utils/AppError.js";
import { ticketRepo } from "../repositories/ticket.repository.js";
import { empresaGestionRepo } from "../repositories/empresa.repository.js";

const r2 = (n) => Math.round(n * 100) / 100;

export const ticketsService = {
  async obtener(u, id) {
    const m = await ticketRepo.movimiento(u.empresaId, id);
    if (!m) throw new AppError("Movimiento no encontrado", 404, "NOT_FOUND");
    const [pagos, empresa, config] = await Promise.all([
      ticketRepo.pagos(u.empresaId, id),
      empresaGestionRepo.perfil(u.empresaId),
      empresaGestionRepo.config(u.empresaId),
    ]);

    const min = Math.max(0, Number(m.minutos) || 0);
    const aplicado = pagos.reduce((a, p) => a + Number(p.monto), 0);
    const recibido = pagos.reduce(
      (a, p) => a + Number(p.monto_recibido ?? p.monto),
      0,
    );

    return {
      movimiento: {
        id: m.id_movimiento,
        estado: m.estado,
        fecha_entrada: m.fecha_entrada,
        fecha_salida: m.fecha_salida,
        total: m.total_a_pagar == null ? null : Number(m.total_a_pagar),
      },
      vehiculo: { placa: m.placa, tipo: m.tipo, tipo_codigo: m.tipo_codigo },
      tarifa: {
        modo_cobro: m.modo_cobro,
        valor_minuto: Number(m.valor_minuto),
        valor_hora: Number(m.valor_hora),
        valor_dia_completo: Number(m.valor_dia_completo),
      },
      tiempo: {
        dias: Math.floor(min / 1440),
        horas: Math.floor((min % 1440) / 60),
        minutos: min % 60,
      },
      pagos: pagos.map((p) => ({
        metodo_pago: p.metodo_pago,
        monto: Number(p.monto),
      })),
      recibido: r2(recibido),
      vuelto: r2(Math.max(0, recibido - aplicado)),
      atendido: { entrada: m.atendido_entrada, salida: m.atendido_salida },
      empresa: {
        nombre: empresa.nombre,
        nit: empresa.nit,
        direccion: empresa.direccion,
        telefono: empresa.telefono,
        tiene_logo: !!empresa.tiene_logo,
      },
      config: {
        operacion_24h: !!config.operacion_24h,
        horario_apertura: config.horario_apertura,
        horario_cierre: config.horario_cierre,
      },
    };
  },
};
