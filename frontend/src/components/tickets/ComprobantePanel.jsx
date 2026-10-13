// frontend/src/components/tickets/ComprobantePanel.jsx
import { useEffect, useMemo, useRef } from "react";
import { Printer, X } from "lucide-react";
import { useGet } from "../../hooks/useApi";
import { useFormat } from "../../hooks/useEmpresa";
import { printHtml, ticketDocument } from "../../utils/print";
import { buildTicketHtml } from "./ticketHtml";
import Button from "../ui/Button";

export const useTicket = (id) =>
  useGet(["ticket", id], `/movimientos/${id}/ticket`, {
    enabled: !!id,
    staleTime: 60_000,
  });

export default function ComprobantePanel({
  id,
  tipo,
  autoPrint = false,
  onClose,
}) {
  const { data, isLoading, error } = useTicket(id);
  const fmt = useFormat();
  const impreso = useRef(false);
  const titulo = tipo === "INGRESO" ? "Comprobante de Ingreso" : "Factura";

  const preview = useMemo(
    () =>
      data
        ? ticketDocument(buildTicketHtml(data, tipo, fmt), {
            widthMm: 80,
            title: titulo,
          })
        : "",
    [data, tipo, fmt, titulo],
  );
  const imprimir = (widthMm) =>
    printHtml(buildTicketHtml(data, tipo, fmt), { widthMm, title: titulo }); // hora de impresión fresca

  // La factura de salida se imprime sola al confirmar el pago (80 mm), como en el original.
  useEffect(() => {
    if (autoPrint && data && !impreso.current) {
      impreso.current = true;
      imprimir(80);
    }
  }, [autoPrint, data]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="mt-4 rounded-lg border border-slate-200 p-3">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700">{titulo}</h3>
        <button
          onClick={onClose}
          aria-label="Cerrar"
          className="rounded p-1 text-slate-500 hover:bg-slate-100"
        >
          <X size={16} />
        </button>
      </div>
      {isLoading && (
        <p className="py-6 text-center text-sm text-slate-500">
          Generando comprobante…
        </p>
      )}
      {error && (
        <p className="py-6 text-center text-sm text-red-600">
          {error.userMessage}
        </p>
      )}
      {data && (
        <>
          <iframe
            title="Vista previa del ticket"
            srcDoc={preview}
            className="h-96 w-full rounded border border-slate-200 bg-white"
          />
          <div className="mt-2 flex gap-2">
            <Button variant="outline" onClick={() => imprimir(58)}>
              <Printer size={14} className="mr-1" />
              Imprimir 58 mm
            </Button>
            <Button variant="outline" onClick={() => imprimir(80)}>
              <Printer size={14} className="mr-1" />
              Imprimir 80 mm
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
