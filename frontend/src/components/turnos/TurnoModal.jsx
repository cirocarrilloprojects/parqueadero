// frontend/src/components/turnos/TurnoModal.jsx
import { useEffect, useState } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { useQueryClient } from "@tanstack/react-query";
import { Printer } from "lucide-react";
import { api } from "../../api/client";
import { useGet } from "../../hooks/useApi";
import { useEmpresa, useFormat } from "../../hooks/useEmpresa";
import { printHtml } from "../../utils/print";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import { Field, FormError, inputCls } from "../ui/Field";
import { useToast } from "../ui/Toast";
import CierreTicket from "./CierreTicket";

const num = (v) => Number(v || 0);

function Apertura({ onClose }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [base, setBase] = useState("");
  const [obs, setObs] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api.post("/turnos/abrir", {
        base_inicial: num(base),
        observacion_apertura: obs || undefined,
      });
      await qc.invalidateQueries({ queryKey: ["turno"] });
      toast.success("Turno abierto correctamente");
      onClose();
    } catch (err) {
      setError(err.userMessage);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Turno de Caja — Apertura"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cerrar
          </Button>
          <Button type="submit" form="apertura" loading={busy}>
            Abrir turno
          </Button>
        </>
      }
    >
      <form id="apertura" onSubmit={submit} className="space-y-3">
        <FormError message={error} />
        <Field label="Base inicial">
          <input
            type="number"
            min="0"
            step="0.01"
            className={inputCls}
            value={base}
            onChange={(e) => setBase(e.target.value)}
            placeholder="0.00"
            autoFocus
          />
        </Field>
        <Field label="Observación (opcional)">
          <input
            maxLength={255}
            className={inputCls}
            value={obs}
            onChange={(e) => setObs(e.target.value)}
          />
        </Field>
        <p className="text-xs text-slate-500">
          Debes abrir turno para poder registrar ingresos y salidas.
        </p>
      </form>
    </Modal>
  );
}

function Cierre({ onClose }) {
  const qc = useQueryClient();
  const { fmtMoney, fmtDate } = useFormat();
  const { data: empresa } = useEmpresa();
  const { data: res } = useGet(["turno", "resumen"], "/turnos/resumen", {
    staleTime: 0,
    gcTime: 0,
  });
  const [v, setV] = useState({ ef: "", ta: "", qr: "", obs: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [cerrado, setCerrado] = useState(null);
  const set = (k) => (e) => setV({ ...v, [k]: e.target.value });

  // Pre-carga los totales esperados por método de pago cuando el resumen llega.
  // No sobreescribe lo que el cajero ya haya escrito.
  useEffect(() => {
    if (!res?.totales) return;
    setV((prev) => ({
      ...prev,
      ef: prev.ef === "" ? String(res.totales.efectivo) : prev.ef,
      ta: prev.ta === "" ? String(res.totales.tarjeta) : prev.ta,
      qr: prev.qr === "" ? String(res.totales.qr) : prev.qr,
    }));
  }, [res?.totales]);

  const total = num(v.ef) + num(v.ta) + num(v.qr);
  const esperado = res?.totales;
  const diff = esperado ? Math.round((total - esperado.total) * 100) / 100 : 0;

  const imprimir = (data, widthMm) =>
    printHtml(
      renderToStaticMarkup(
        <CierreTicket
          empresa={empresa}
          r={data}
          fmtMoney={fmtMoney}
          ahora={fmtDate(new Date().toISOString())}
        />,
      ),
      { widthMm, title: "Cierre de turno" },
    );

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const { data } = await api.post("/turnos/cerrar", {
        total_efectivo: num(v.ef),
        total_tarjeta: num(v.ta),
        total_qr: num(v.qr),
        observacion_cierre: v.obs || undefined,
      });
      await qc.invalidateQueries({ queryKey: ["turno"] });
      setCerrado(data.data);
      // Imprime automáticamente al cerrar (80 mm por defecto).
      imprimir(data.data, 80);
    } catch (err) {
      setError(err.userMessage);
    } finally {
      setBusy(false);
    }
  }

  if (cerrado) {
    const dif = cerrado.diferencia;
    return (
      <Modal
        open
        onClose={onClose}
        title="Turno cerrado"
        footer={
          <>
            <Button variant="outline" onClick={() => imprimir(cerrado, 58)}>
              <Printer size={14} className="mr-1" />
              Imprimir 58 mm
            </Button>
            <Button onClick={() => imprimir(cerrado, 80)}>
              <Printer size={14} className="mr-1" />
              Imprimir 80 mm
            </Button>
            <Button variant="outline" onClick={onClose}>
              Cerrar
            </Button>
          </>
        }
      >
        <p
          className={`mb-3 rounded-lg px-3 py-2 text-sm ${
            Math.abs(dif) < 0.01
              ? "bg-emerald-50 text-emerald-700"
              : dif < 0
                ? "bg-red-50 text-red-700"
                : "bg-amber-50 text-amber-800"
          }`}
        >
          {Math.abs(dif) < 0.01
            ? "Turno cerrado sin diferencias. Caja cuadra."
            : dif < 0
              ? `Falta dinero en caja: ${fmtMoney(Math.abs(dif))}.`
              : `Sobra dinero en caja: ${fmtMoney(dif)}.`}
        </p>
        <dl className="grid grid-cols-2 gap-2 text-sm">
          <dt className="text-slate-500">Conteo</dt>
          <dd className="text-right font-medium">
            {fmtMoney(cerrado.conteo.total)}
          </dd>
          <dt className="text-slate-500">Sistema</dt>
          <dd className="text-right font-medium">
            {fmtMoney(cerrado.esperado.total)}
          </dd>
          <dt className="text-slate-500">Tickets</dt>
          <dd className="text-right font-medium">{cerrado.stats.total}</dd>
        </dl>
      </Modal>
    );
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Turno de Caja — Cierre"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="success" type="submit" form="cierre" loading={busy}>
            Cerrar e imprimir
          </Button>
        </>
      }
    >
      <form id="cierre" onSubmit={submit} className="space-y-3">
        <FormError message={error} />

        {esperado?.transferencia > 0 && (
          <p className="rounded bg-amber-50 px-2 py-1 text-xs text-amber-800">
            <b>No incluyas esta cifra en Efectivo/Tarjeta/QR.</b> Transferencias
            de mensualidades en este turno: {fmtMoney(esperado.transferencia)}.
            No pasan por caja física.
          </p>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Field label="Efectivo">
            <input
              type="number"
              min="0"
              step="0.01"
              className={inputCls}
              value={v.ef}
              onChange={set("ef")}
              placeholder="0.00"
              autoFocus
            />
          </Field>
          <Field label="Tarjeta">
            <input
              type="number"
              min="0"
              step="0.01"
              className={inputCls}
              value={v.ta}
              onChange={set("ta")}
              placeholder="0.00"
            />
          </Field>
          <Field label="QR">
            <input
              type="number"
              min="0"
              step="0.01"
              className={inputCls}
              value={v.qr}
              onChange={set("qr")}
              placeholder="0.00"
            />
          </Field>
          <Field label="Total">
            <input readOnly className={inputCls} value={total.toFixed(2)} />
          </Field>
        </div>

        <div className="flex flex-wrap justify-between gap-2 text-sm">
          <span>
            Sistema (esperado):{" "}
            <strong>{esperado ? fmtMoney(esperado.total) : "…"}</strong>
          </span>
          <span>
            Diferencia:{" "}
            <strong
              className={
                Math.abs(diff) < 0.01
                  ? "text-emerald-600"
                  : diff < 0
                    ? "text-red-600"
                    : "text-amber-700"
              }
            >
              {fmtMoney(diff)}
              {Math.abs(diff) >= 0.01 && (
                <span className="ml-1 font-normal">
                  ({diff < 0 ? "falta" : "sobra"})
                </span>
              )}
            </strong>
          </span>
        </div>

        <p className="text-xs text-slate-500">
          La diferencia es <b>conteo menos sistema</b>. Negativa significa que
          falta dinero en caja; positiva, que sobra.
        </p>

        <Field label="Observación de cierre">
          <input
            maxLength={255}
            className={inputCls}
            value={v.obs}
            onChange={set("obs")}
          />
        </Field>
      </form>
    </Modal>
  );
}

export default function TurnoModal({ modo, onClose }) {
  return modo === "cierre" ? (
    <Cierre onClose={onClose} />
  ) : (
    <Apertura onClose={onClose} />
  );
}
