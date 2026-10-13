// components/movimientos/IngresoForm.jsx
import { useState } from "react";
import { useAuth } from "../../context/AuthContext.jsx";
import {
  useRegistrarIngreso,
  useTiposActivos,
} from "../../hooks/useMovimientos.js";
import { formatDateTime } from "../../utils/format.js";
import Button from "../ui/Button.jsx";
import { useTurno } from "../turnos/TurnoProvider";

export default function IngresoForm({ onDone }) {
  const { user } = useAuth();
  const { abierto, requireTurno } = useTurno();
  const { data: tipos = [] } = useTiposActivos();
  const ingreso = useRegistrarIngreso();
  const [placa, setPlaca] = useState("");
  const [tipoId, setTipoId] = useState(null);

  const onSubmit = (e) => {
    e.preventDefault();
    if (!requireTurno()) return; // sin turno abierto: se abre el modal de apertura
    ingreso.mutate(
      { placa, id_tipo: tipoId },
      {
        onSuccess: (d) => {
          setPlaca("");
          onDone?.(d.movimientoId);
        },
      },
    );
  };

  const c = ingreso.data; // comprobante del último ingreso

  return (
    <section className="rounded-xl bg-white p-6 shadow">
      <h2 className="mb-4 text-lg font-semibold">Ingreso rápido</h2>
      <form onSubmit={onSubmit} className="space-y-4">
        <input
          value={placa}
          onChange={(e) => setPlaca(e.target.value.toUpperCase())}
          required
          placeholder="ABC123"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 uppercase"
        />
        <div className="flex flex-wrap gap-2">
          {tipos.map((t) => (
            <button
              key={t.id_tipo}
              type="button"
              onClick={() => setTipoId(t.id_tipo)}
              className={`rounded-lg border-2 px-4 py-2 text-sm ${tipoId === t.id_tipo ? "border-brand-600 bg-brand-600 text-white" : "border-gray-300"}`}
            >
              {t.nombre}
            </button>
          ))}
        </div>
        {ingreso.isError && (
          <p role="alert" className="text-sm text-red-600">
            {ingreso.error.userMessage}
          </p>
        )}
        <Button
          type="submit"
          variant="success"
          loading={ingreso.isPending}
          disabled={!placa || !tipoId || !abierto}
          className="w-full"
        >
          Ingresar
        </Button>
      </form>

      {c && (
        <div className="mt-4 rounded-lg bg-green-50 p-4 text-sm">
          <p>
            Movimiento <b>#{c.movimientoId}</b> · Placa <b>{c.placa}</b> ·{" "}
            {c.tipo}
          </p>
          <p>
            Entrada: {formatDateTime(c.fechaEntrada, user.config?.zona_horaria)}
          </p>
        </div>
      )}
    </section>
  );
}
