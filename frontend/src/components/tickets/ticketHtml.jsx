// frontend/src/components/tickets/ticketHtml.jsx
import { renderToStaticMarkup } from "react-dom/server";
import Ticket from "./Ticket";

export const buildTicketHtml = (data, tipo, { fmtMoney, fmtDate }) =>
  renderToStaticMarkup(
    <Ticket
      tipo={tipo}
      data={data}
      fmtMoney={fmtMoney}
      fmtDate={fmtDate}
      impreso={fmtDate(new Date().toISOString())}
    />,
  );
