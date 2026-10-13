// frontend/src/components/tickets/recibo.jsx
import { renderToStaticMarkup } from "react-dom/server";
import api from "../../api/client";
import { printHtml } from "../../utils/print";
import { fmtYmd } from "../../utils/ymd";

const LOGO = `${import.meta.env.VITE_API_URL ?? "/api"}/empresa/logo`;
const metodo = (m) =>
  ({
    efectivo: "Efectivo",
    tarjeta: "Tarjeta",
    QR: "QR",
    transferencia: "Transferencia",
  })[m] ?? m;

export function ReciboMensualidad({ data, fmtMoney, fmtDate, impreso }) {
  const { empresa: e, mensualidad: m, pago: p } = data;
  return (
    <div>
      <div className="c">
        {e.tiene_logo && <img src={LOGO} alt="" />}
        <div className="b">{e.nombre}</div>
        <div>NIT: {e.nit}</div>
        <div>{[e.direccion, e.telefono].filter(Boolean).join(" - ")}</div>
        <hr />
        <div className="b">PAGO MENSUALIDAD</div>
      </div>
      <div>
        Mensualidad: <span className="b">#{m.id}</span>
      </div>
      <div>
        Placa: <span className="b">{m.placa}</span>
      </div>
      <div>
        Titular: <span className="b">{m.titular}</span>
      </div>
      <div>
        Periodo:{" "}
        <span className="b">
          {fmtYmd(p.periodo_desde)} - {fmtYmd(p.periodo_hasta)}
        </span>
      </div>
      <div>
        Método: <span className="b">{metodo(p.metodo_pago)}</span>
      </div>
      <div>
        Monto: <span className="b">{fmtMoney(p.monto)}</span>
      </div>
      {p.referencia && (
        <div>
          Referencia: <span className="b">{p.referencia}</span>
        </div>
      )}
      <div>Fecha: {fmtDate(p.fecha_pago)}</div>
      <div>Atendido por: {data.atendido}</div>
      <div>Impreso: {impreso}</div>
    </div>
  );
}

export async function imprimirRecibo(idMens, idPago, fmt, widthMm = 80) {
  const { data } = await api.get(
    `/mensualidades/${idMens}/pagos/${idPago}/recibo`,
  );
  const html = renderToStaticMarkup(
    <ReciboMensualidad
      data={data.data}
      fmtMoney={fmt.fmtMoney}
      fmtDate={fmt.fmtDate}
      impreso={fmt.fmtDate(new Date().toISOString())}
    />,
  );
  return printHtml(html, { widthMm, title: "Recibo de pago" });
}
