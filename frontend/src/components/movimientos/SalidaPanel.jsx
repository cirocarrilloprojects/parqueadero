// components/movimientos/SalidaPanel.jsx
import { useState } from "react";
import { useAuth } from "../../context/AuthContext.jsx";
import {
  useCalcularSalida,
  useConfirmarSalida,
} from "../../hooks/useMovimientos.js";
import { formatDateTime, formatMoney } from "../../utils/format.js";
import Button from "../ui/Button.jsx";
import PagoModal from "./PagoModal.jsx";
import { useTurno } from "../turnos/TurnoProvider";

export default function SalidaPanel() {
  const { user } = useAuth();
  const { requireTurno } = useTurno();
  const tz = user.config?.zona_horaria;
  const [placa, setPlaca] = useState("");
  const [factura, setFactura] = useState(null);
  const [final, setFinal] = useState(null);
  const calcular = useCalcularSalida();
  const confirmar = useConfirmarSalida();

  const onCalcular = (e) => {
    e.preventDefault();
    setFinal(null);
    calcular.mutate(placa, { onSuccess: setFactura });
  };

  const onConfirm = (pagos) => {
    if (!requireTurno()) return; // sin turno abierto: se abre el modal de apertura
    confirmar.mutate(
      { placa: factura.placa, pagos },
      {
        onSuccess: (data) => {
          setFinal(data);
          setFactura(null);
          setPlaca("");
        },
      },
    );
  };

  return (
    <section className="rounded-xl bg-white p-6 shadow">
      <h2 className="mb-4 text-lg font-semibold">Salida y cobro</h2>
      <form onSubmit={onCalcular} className="flex gap-2">
        <input
          value={placa}
          onChange={(e) => setPlaca(e.target.value.toUpperCase())}
          required
          placeholder="ABC123"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 uppercase"
        />
        <Button type="submit" variant="danger" loading={calcular.isPending}>
          Calcular
        </Button>
      </form>
      {calcular.isError && (
        <p role="alert" className="mt-2 text-sm text-red-600">
          {calcular.error.userMessage}
        </p>
      )}

      {final && (
        <div className="mt-4 rounded-lg bg-green-50 p-4 text-sm">
          <p>
            Salida registrada: <b>{final.placa}</b> · Total{" "}
            {formatMoney(final.total, user.config?.moneda)}
          </p>
          <p>
            Vuelto: {formatMoney(final.vuelto, user.config?.moneda)} · Salida:{" "}
            {formatDateTime(final.fechaSalida, tz)}
          </p>
        </div>
      )}

      {factura && (
        <PagoModal
          factura={factura}
          loading={confirmar.isPending}
          error={confirmar.error?.userMessage}
          onCancel={() => setFactura(null)}
          onConfirm={onConfirm}
        />
      )}
    </section>
  );
}
