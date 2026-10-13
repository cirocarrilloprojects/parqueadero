// frontend/src/components/turnos/CierreTicket.jsx
// Se renderiza a HTML estático para imprimir; las clases (c, b, row) son del CSS de utils/print.js.
export default function CierreTicket({ empresa, r, fmtMoney, ahora }) {
  const dif = r.diferencia;
  const cuadra = Math.abs(dif) < 0.01;
  return (
    <div>
      <div className="c">
        <div className="b">{empresa?.nombre}</div>
        {empresa?.nit && <div>NIT: {empresa.nit}</div>}
        <hr />
        <div className="b">CIERRE DE TURNO</div>
      </div>
      <div>
        Turno #{r.turno.id_turno} | Usuario: {r.turno.usuario}
      </div>
      <div>Fecha: {ahora}</div>
      <div>
        Base inicial: <span className="b">{fmtMoney(r.base)}</span>
      </div>
      <div>
        Tickets: <span className="b">{r.stats.total}</span>
      </div>
      {r.stats.porTipo.map((t) => (
        <div key={t.codigo}>
          {t.nombre}: {t.cantidad}
        </div>
      ))}
      <hr />
      <div className="b">Conteo usuario</div>
      <div className="row">
        <span>Efectivo</span>
        <span>{fmtMoney(r.conteo.efectivo)}</span>
      </div>
      <div className="row">
        <span>Tarjeta</span>
        <span>{fmtMoney(r.conteo.tarjeta)}</span>
      </div>
      <div className="row">
        <span>QR</span>
        <span>{fmtMoney(r.conteo.qr)}</span>
      </div>
      <div className="row b">
        <span>Total</span>
        <span>{fmtMoney(r.conteo.total)}</span>
      </div>
      <hr />
      <div className="b">Sistema</div>
      <div className="row">
        <span>Efectivo</span>
        <span>{fmtMoney(r.esperado.efectivo)}</span>
      </div>
      <div className="row">
        <span>Tarjeta</span>
        <span>{fmtMoney(r.esperado.tarjeta)}</span>
      </div>
      <div className="row">
        <span>QR</span>
        <span>{fmtMoney(r.esperado.qr)}</span>
      </div>
      <div className="row b">
        <span>Total</span>
        <span>{fmtMoney(r.esperado.total)}</span>
      </div>
      {r.esperado.transferencia > 0 && (
        <div>
          Transferencias (fuera de caja): {fmtMoney(r.esperado.transferencia)}
        </div>
      )}
      <hr />
      <div className="b">
        {cuadra
          ? "Caja cuadra"
          : dif < 0
            ? `FALTANTE EN CAJA: ${fmtMoney(Math.abs(dif))}`
            : `SOBRANTE EN CAJA: ${fmtMoney(dif)}`}
      </div>
      {r.observacion && <div>Obs.: {r.observacion}</div>}
    </div>
  );
}
