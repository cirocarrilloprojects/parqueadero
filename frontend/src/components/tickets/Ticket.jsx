// frontend/src/components/tickets/Ticket.jsx
// Se renderiza con renderToStaticMarkup: React escapa todos los datos (placa, empresa, etc.).
import { barcodeSvg } from "../../utils/barcode";

const LOGO = `${import.meta.env.VITE_API_URL ?? "/api"}/empresa/logo`;
const hhmm = (t) => String(t ?? "").slice(0, 5);
const metodo = (m) =>
  ({ efectivo: "Efectivo", tarjeta: "Tarjeta", QR: "QR" })[m] ?? m;

export default function Ticket({ tipo, data, fmtMoney, fmtDate, impreso }) {
  const {
    empresa: e,
    config: c,
    movimiento: m,
    vehiculo: v,
    tarifa: t,
    tiempo,
    pagos,
    atendido,
  } = data;
  const salida = tipo === "SALIDA";
  const horario = c.operacion_24h
    ? "24 horas"
    : `${hhmm(c.horario_apertura)} - ${hhmm(c.horario_cierre)}`;

  return (
    <div>
      <div className="c">
        {e.tiene_logo && <img src={LOGO} alt="" />}
        <div className="b">{e.nombre}</div>
        <div>NIT: {e.nit}</div>
        <div>{[e.direccion, e.telefono].filter(Boolean).join(" - ")}</div>
        <div>
          Horario: <span className="b">{horario}</span>
        </div>
        <hr />
        <div className="b">{tipo}</div>
      </div>

      <div>
        Movimiento: <span className="b">#{m.id}</span>
      </div>
      <div>
        Placa: <span className="b">{v.placa}</span>
      </div>
      <div>
        Tipo: <span className="b">{v.tipo}</span>
      </div>
      <div>
        Entrada: <span className="b">{fmtDate(m.fecha_entrada)}</span>
      </div>
      {salida && (
        <div>
          Salida: <span className="b">{fmtDate(m.fecha_salida)}</span>
        </div>
      )}
      {salida && (
        <div>
          Tiempo:{" "}
          <span className="b">
            {tiempo.dias}d {tiempo.horas}h {tiempo.minutos}m
          </span>
        </div>
      )}
      <hr />
      <div>Tarifas</div>
      <div>
        Minuto: <span className="b">{fmtMoney(t.valor_minuto)}</span>
      </div>
      <div>
        Hora: <span className="b">{fmtMoney(t.valor_hora)}</span>
      </div>
      <div>
        Día: <span className="b">{fmtMoney(t.valor_dia_completo)}</span>
      </div>
      <hr />

      {salida && (
        <>
          <div className="row b">
            <span>Total a pagar</span>
            <span>{fmtMoney(m.total)}</span>
          </div>
          {pagos.length > 0 && <div className="b">Pagos</div>}
          {pagos.map((p, i) => (
            <div key={i} className="row">
              <span>{metodo(p.metodo_pago)}</span>
              <span>{fmtMoney(p.monto)}</span>
            </div>
          ))}
          {data.vuelto > 0 && (
            <>
              <div className="row">
                <span>Recibido</span>
                <span>{fmtMoney(data.recibido)}</span>
              </div>
              <div className="row b">
                <span>Vuelto</span>
                <span>{fmtMoney(data.vuelto)}</span>
              </div>
            </>
          )}
          <hr />
        </>
      )}

      <div>Atendido por: {salida ? atendido.salida : atendido.entrada}</div>
      <div>Fecha impresión: {impreso}</div>
      {!salida && (
        <div dangerouslySetInnerHTML={{ __html: barcodeSvg(v.placa) }} />
      )}
    </div>
  );
}
