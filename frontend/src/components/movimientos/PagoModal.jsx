// frontend/src/components/movimientos/PagoModal.jsx
import { useState } from "react";
import { useAuth } from "../../context/AuthContext.jsx";
import { formatMoney } from "../../utils/format.js";
import Button from "../ui/Button.jsx";

const METODOS = ["efectivo", "tarjeta", "QR", "transferencia"];

export default function PagoModal({
  factura,
  onConfirm,
  onCancel,
  loading,
  error,
}) {
  const { user } = useAuth();
  const moneda = user.config?.moneda ?? "COP";

  // Punto de partida: UNA fila de efectivo con el total exacto.
  // El cajero debe editar este monto si el cliente entregó más.
  const [pagos, setPagos] = useState([
    { metodo_pago: "efectivo", monto: factura.total },
  ]);

  const recibido = pagos.reduce((s, p) => s + Number(p.monto || 0), 0);
  const diff = recibido - factura.total;

  const set = (i, patch) =>
    setPagos((ps) => ps.map((p, j) => (j === i ? { ...p, ...patch } : p)));

  const cubrirConTotal = () => {
    // Rellena la primera fila con el total exacto en efectivo.
    // Útil cuando el cajero ya había editado el campo y quiere volver al default.
    const otros = pagos.slice(1).reduce((s, p) => s + Number(p.monto || 0), 0);
    const faltante = Math.max(0, factura.total - otros);
    set(0, { metodo_pago: "efectivo", monto: faltante });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-md space-y-4 rounded-xl bg-white p-6 shadow-xl">
        <h3 className="text-lg font-semibold">Registrar pago</h3>

        <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
          <span className="text-sm text-slate-600">Total a pagar</span>
          <b className="text-lg">{formatMoney(factura.total, moneda)}</b>
        </div>

        <div className="space-y-2">
          <p className="text-xs text-slate-500">
            Escribe el monto que entrega el cliente por cada medio de pago. Si
            entrega más del total, el sobrante aparece como vuelto.
          </p>
          {pagos.map((p, i) => (
            <div key={i} className="flex gap-2">
              <select
                value={p.metodo_pago}
                onChange={(e) => set(i, { metodo_pago: e.target.value })}
                className="rounded-lg border px-2 py-1"
              >
                {METODOS.map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </select>
              <input
                type="number"
                min="0"
                step="0.01"
                value={p.monto}
                onChange={(e) => set(i, { monto: e.target.value })}
                placeholder="0.00"
                className="w-full rounded-lg border px-2 py-1"
              />
              {pagos.length > 1 && (
                <button
                  type="button"
                  onClick={() => setPagos((ps) => ps.filter((_, j) => j !== i))}
                  aria-label="Quitar"
                  className="rounded px-2 text-slate-500 hover:bg-slate-100"
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="text-sm text-brand-600 hover:underline"
            onClick={() =>
              setPagos((ps) => [...ps, { metodo_pago: "tarjeta", monto: "" }])
            }
          >
            + Agregar medio de pago
          </button>
          <button
            type="button"
            className="text-sm text-slate-500 hover:underline"
            onClick={cubrirConTotal}
          >
            Rellenar con el total
          </button>
        </div>

        <div
          className={`rounded-lg p-3 text-sm ${diff >= 0 ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}
        >
          Recibido: <b>{formatMoney(recibido, moneda)}</b> ·{" "}
          {diff >= 0 ? "Vuelto" : "Falta"}:{" "}
          <b>{formatMoney(Math.abs(diff), moneda)}</b>
        </div>

        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button
            variant="success"
            loading={loading}
            disabled={diff < 0}
            onClick={() =>
              onConfirm(
                pagos
                  .map((p) => ({ ...p, monto: Number(p.monto) }))
                  .filter((p) => p.monto > 0),
              )
            }
          >
            Confirmar pagos
          </Button>
        </div>
      </div>
    </div>
  );
}
