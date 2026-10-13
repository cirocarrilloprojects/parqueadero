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
  const { abierto, requireTurno, bloqueado, horario } = useTurno();
  const { data: tipos = [] } = useTiposActivos();
  const ingreso = useRegistrarIngreso();
  const [placa, setPlaca] = useState("");
  const [tipoId, setTipoId] = useState(null);

  // El admin no se bloquea por horario. Coherente con el backend.
  const bloqueadoPorHorario = user?.rol !== "admin" && bloqueado;
  const puedeIngresar = abierto && !bloqueadoPorHorario;

  const onSubmit = (e) => {
    e.preventDefault();
    if (!requireTurno()) return;
    if (bloqueadoPorHorario) return; // defensa extra
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

  const c = ingreso.data;

  return (
    <section className="rounded-xl bg-white p-6 shadow">
      <h2 className="mb-4 text-lg font-semibold">Ingreso rápido</h2>
      {bloqueadoPorHorario && (
        <p className="mb-3 rounded bg-red-50 px-3 py-2 text-sm text-red-700">
          El parqueadero está cerrado ({horario?.horarioCierre}). No se pueden
          registrar nuevos ingresos.
        </p>
      )}
      <form onSubmit={onSubmit} className="space-y-4">
        <input
          value={placa}
          onChange={(e) => setPlaca(e.target.value.toUpperCase())}
          required
          placeholder="ABC123"
          disabled={bloqueadoPorHorario}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 uppercase disabled:bg-slate-100"
        />
        <div className="flex flex-wrap gap-2">
          {tipos.map((t) => (
            <button
              key={t.id_tipo}
              type="button"
              onClick={() => setTipoId(t.id_tipo)}
              disabled={bloqueadoPorHorario}
              className={`rounded-lg border-2 px-4 py-2 text-sm disabled:opacity-50 ${tipoId === t.id_tipo ? "border-brand-600 bg-brand-600 text-white" : "border-gray-300"}`}
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
          disabled={!placa || !tipoId || !puedeIngresar}
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
