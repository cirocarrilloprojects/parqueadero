// frontend/src/pages/MensualidadesPage.jsx
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { keepPreviousData } from "@tanstack/react-query";
import {
  CalendarCheck,
  Plus,
  Pencil,
  DollarSign,
  Receipt,
  Printer,
  Search,
  Minus,
} from "lucide-react";
import api from "../api/client";
import { useGet, useApiMutation } from "../hooks/useApi";
import { useFormat } from "../hooks/useEmpresa";
import { useTurno } from "../components/turnos/TurnoProvider";
import { imprimirRecibo } from "../components/tickets/recibo";
import { fmtYmd, hoyYmd, qs } from "../utils/ymd";
import Card from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import Modal from "../components/ui/Modal";
import { Field, FormError, inputCls } from "../components/ui/Field";
import { useToast } from "../components/ui/Toast";

const ESTADOS = [
  ["", "Todos"],
  ["activa", "Activas"],
  ["vencida", "Vencidas"],
  ["cancelada", "Canceladas"],
];
const PAGE_SIZE = 10;

function DueBadge({ m }) {
  if (m.due_status === "inactivo") return <Badge tone="gray">Inactivo</Badge>;
  if (m.due_status === "vencido")
    return <Badge tone="red">Vencida ×{m.overdue_payments}</Badge>;
  if (m.due_status === "proximo")
    return (
      <Badge tone={m.days_to_next <= 2 ? "red" : "amber"}>
        Próximo en {m.days_to_next}d
      </Badge>
    );
  return <Badge tone="green">Al día</Badge>;
}
const nextInfo = (m) =>
  m.due_status === "inactivo"
    ? "Sin próximos pagos"
    : m.due_status === "vencido"
      ? `Tiene ${m.overdue_payments} pago(s) vencido(s)`
      : `Próximo pago: ${fmtYmd(m.next_payment_date)}`;

function MensModal({ mens, tipos, onClose }) {
  const toast = useToast();
  const { tz } = useFormat();
  const editando = !!mens.id_mensualidad;
  const [error, setError] = useState("");
  const { register, handleSubmit } = useForm({
    defaultValues: {
      placa: mens.placa ?? "",
      id_tipo: "",
      titular_nombre: mens.titular_nombre ?? "",
      titular_documento: mens.titular_documento ?? "",
      titular_telefono: mens.titular_telefono ?? "",
      titular_email: mens.titular_email ?? "",
      valor_mensual: mens.valor_mensual ?? "",
      fecha_inicio: mens.fecha_inicio ?? hoyYmd(tz),
      fecha_fin: mens.fecha_fin ?? "",
      auto_renovar: mens.auto_renovar ?? true,
      observaciones: mens.observaciones ?? "",
    },
  });
  const save = useApiMutation(
    (v) =>
      editando
        ? api.put(`/mensualidades/${mens.id_mensualidad}`, v)
        : api.post("/mensualidades", v),
    { invalidate: [["mensualidades"]], silent: true },
  );

  const onSubmit = async (v) => {
    setError("");
    try {
      await save.mutateAsync({
        ...v,
        id_tipo: v.id_tipo ? Number(v.id_tipo) : undefined,
        fecha_fin: v.fecha_fin || null,
        valor_mensual: Number(v.valor_mensual),
      });
      toast.success(
        editando ? "Mensualidad actualizada" : "Mensualidad creada",
      );
      onClose();
    } catch (e) {
      setError(e.userMessage);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={
        editando
          ? `Editar mensualidad #${mens.id_mensualidad}`
          : "Nueva mensualidad"
      }
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="mens-form" loading={save.isPending}>
            Guardar
          </Button>
        </>
      }
    >
      <form
        id="mens-form"
        onSubmit={handleSubmit(onSubmit)}
        className="grid gap-4 sm:grid-cols-3"
      >
        <div className="sm:col-span-3">
          <FormError message={error} />
        </div>
        <Field
          label="Placa"
          hint="Si no existe, se crea el vehículo con datos mínimos."
        >
          <input
            className={`${inputCls} uppercase`}
            required
            maxLength={10}
            {...register("placa")}
          />
        </Field>
        <Field label="Tipo de vehículo" hint="Solo si la placa es nueva">
          <select className={inputCls} {...register("id_tipo")}>
            <option value="">(vehículo existente)</option>
            {tipos.map((t) => (
              <option key={t.id_tipo} value={t.id_tipo}>
                {t.nombre}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Titular">
          <input
            className={inputCls}
            required
            {...register("titular_nombre")}
          />
        </Field>
        <Field label="Documento">
          <input className={inputCls} {...register("titular_documento")} />
        </Field>
        <Field label="Teléfono">
          <input className={inputCls} {...register("titular_telefono")} />
        </Field>
        <Field label="Email">
          <input
            type="email"
            className={inputCls}
            {...register("titular_email")}
          />
        </Field>
        <Field label="Valor mensual">
          <input
            type="number"
            min="0"
            step="0.01"
            className={inputCls}
            required
            {...register("valor_mensual")}
          />
        </Field>
        <Field label="Fecha inicio">
          <input
            type="date"
            className={inputCls}
            required
            {...register("fecha_inicio")}
          />
        </Field>
        <Field label="Fecha fin">
          <input type="date" className={inputCls} {...register("fecha_fin")} />
        </Field>
        <label className="flex items-center gap-2 text-sm sm:col-span-3">
          <input
            type="checkbox"
            className="h-4 w-4 accent-brand-600"
            {...register("auto_renovar")}
          />
          Auto-renovar
        </label>
        <Field label="Observaciones" className="sm:col-span-3">
          <textarea
            rows={2}
            className={inputCls}
            {...register("observaciones")}
          />
        </Field>
      </form>
    </Modal>
  );
}

function PagoModal({ mens, onClose }) {
  const toast = useToast();
  const fmt = useFormat();
  const { requireTurno } = useTurno();
  const [meses, setMeses] = useState(null); // null: el servidor propone (los meses vencidos)
  const [monto, setMonto] = useState("");
  const [metodo, setMetodo] = useState("efectivo");
  const [ref, setRef] = useState("");
  const [error, setError] = useState("");
  const { data: sug, isFetching } = useGet(
    ["mensualidades", "sug", mens.id_mensualidad, meses],
    `/mensualidades/${mens.id_mensualidad}/sugerencia-pago${meses ? `?meses=${meses}` : ""}`,
    { staleTime: 0 },
  );
  useEffect(() => {
    if (sug && !sug.inactivo) setMonto(String(sug.monto));
  }, [sug?.monto, sug?.meses]); // eslint-disable-line react-hooks/exhaustive-deps

  const pagar = useApiMutation(
    (body) => api.post(`/mensualidades/${mens.id_mensualidad}/pagos`, body),
    { invalidate: [["mensualidades"], ["turno"]], silent: true },
  );
  const cambiar = (d) =>
    setMeses(Math.min(60, Math.max(1, (sug?.meses ?? 1) + d)));

  async function submit(e) {
    e.preventDefault();
    if (!requireTurno()) return;
    setError("");
    try {
      const r = await pagar.mutateAsync({
        meses: sug.meses,
        metodo_pago: metodo,
        monto: Number(monto),
        referencia_pago: ref || undefined,
      });
      toast.success("Pago registrado");
      onClose();
      imprimirRecibo(mens.id_mensualidad, r.id_pago, fmt).catch(() =>
        toast.warning(
          "El pago se registró, pero no se pudo imprimir el recibo",
        ),
      );
    } catch (err) {
      setError(err.userMessage);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={`Registrar pago — ${mens.placa}`}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            variant="success"
            type="submit"
            form="pago-mens"
            loading={pagar.isPending}
            disabled={!sug || sug.inactivo || isFetching}
          >
            Registrar
          </Button>
        </>
      }
    >
      <form
        id="pago-mens"
        onSubmit={submit}
        className="grid gap-4 sm:grid-cols-2"
      >
        <div className="sm:col-span-2">
          <FormError message={error} />
        </div>
        {sug?.inactivo && (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 sm:col-span-2">
            Esta mensualidad está inactiva: no admite pagos.
          </p>
        )}
        <Field
          label="Meses a pagar"
          hint="El periodo se calcula automáticamente."
        >
          <div className="flex">
            <button
              type="button"
              onClick={() => cambiar(-1)}
              className="rounded-l-lg border border-slate-300 px-3 hover:bg-slate-50"
            >
              <Minus size={14} />
            </button>
            <input
              readOnly
              className={`${inputCls} rounded-none text-center`}
              value={sug?.meses ?? ""}
            />
            <button
              type="button"
              onClick={() => cambiar(1)}
              className="rounded-r-lg border border-slate-300 px-3 hover:bg-slate-50"
            >
              <Plus size={14} />
            </button>
          </div>
        </Field>
        <Field label="Periodo">
          <input
            disabled
            className={inputCls}
            value={
              sug && !sug.inactivo
                ? `${fmtYmd(sug.periodo_desde)} - ${fmtYmd(sug.periodo_hasta)}`
                : ""
            }
            readOnly
          />
        </Field>
        <Field label="Método">
          <select
            className={inputCls}
            value={metodo}
            onChange={(e) => setMetodo(e.target.value)}
          >
            <option value="efectivo">Efectivo</option>
            <option value="tarjeta">Tarjeta</option>
            <option value="QR">QR</option>
            <option value="transferencia">Transferencia</option>
          </select>
        </Field>
        <Field
          label="Monto"
          hint={
            sug && !sug.inactivo
              ? `Sugerido: ${fmt.fmtMoney(sug.monto)} (valor mensual × meses)`
              : undefined
          }
        >
          <input
            type="number"
            min="0"
            step="0.01"
            className={inputCls}
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
            required
          />
        </Field>
        <Field label="Referencia" className="sm:col-span-2">
          <input
            maxLength={100}
            className={inputCls}
            value={ref}
            onChange={(e) => setRef(e.target.value)}
          />
        </Field>
      </form>
    </Modal>
  );
}

function HistorialModal({ mens, onClose }) {
  const fmt = useFormat();
  const toast = useToast();
  const { data = [], isLoading } = useGet(
    ["mensualidades", "pagos", mens.id_mensualidad],
    `/mensualidades/${mens.id_mensualidad}/pagos`,
  );
  return (
    <Modal
      open
      onClose={onClose}
      title={`Historial de pagos — ${mens.placa}`}
      footer={
        <Button variant="outline" onClick={onClose}>
          Cerrar
        </Button>
      }
    >
      {isLoading ? (
        <p className="py-4 text-center text-sm text-slate-500">Cargando…</p>
      ) : data.length === 0 ? (
        <p className="py-4 text-center text-sm text-slate-500">
          Sin pagos registrados
        </p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {data.map((p) => (
            <li
              key={p.id_pago}
              className="flex items-center justify-between gap-3 py-3 text-sm"
            >
              <div>
                <div>{fmt.fmtDate(p.fecha_pago)}</div>
                <div className="text-xs text-slate-500">
                  {fmtYmd(p.periodo_desde)} a {fmtYmd(p.periodo_hasta)} ·{" "}
                  {p.usuario}
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-slate-500">{p.metodo_pago}</div>
                <div className="font-semibold">{fmt.fmtMoney(p.monto)}</div>
              </div>
              <button
                title="Reimprimir recibo"
                onClick={() =>
                  imprimirRecibo(mens.id_mensualidad, p.id_pago, fmt).catch(
                    () => toast.error("No se pudo imprimir"),
                  )
                }
                className="rounded border border-brand-600 p-1.5 text-brand-600 hover:bg-brand-600 hover:text-white"
              >
                <Printer size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}

export default function MensualidadesPage() {
  const { fmtMoney } = useFormat();
  const { data: tipos = [] } = useGet(
    ["tipos", "activos"],
    "/tipos-vehiculos/activos",
  );
  const [draft, setDraft] = useState({ q: "", estado: "" });
  const [applied, setApplied] = useState(draft);
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState(null); // { tipo: "mens"|"pago"|"hist", mens }
  const { data, isLoading, error } = useGet(
    ["mensualidades", "lista", applied, page],
    `/mensualidades?${qs({ ...applied, page, pageSize: PAGE_SIZE })}`,
    { placeholderData: keepPreviousData },
  );

  const filas = data?.rows ?? [];
  const paginas = Math.max(1, Math.ceil((data?.total ?? 0) / PAGE_SIZE));
  const aplicar = () => {
    setPage(1);
    setApplied(draft);
  };

  return (
    <>
      <Card
        title="Mensualidades"
        icon={CalendarCheck}
        actions={
          <>
            <div className="relative">
              <Search
                size={14}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                value={draft.q}
                onChange={(e) => setDraft({ ...draft, q: e.target.value })}
                onKeyDown={(e) => e.key === "Enter" && aplicar()}
                placeholder="Placa, titular o documento"
                className={`${inputCls} w-64! pl-8!`}
              />
            </div>
            <select
              value={draft.estado}
              onChange={(e) => setDraft({ ...draft, estado: e.target.value })}
              className={`${inputCls} w-36!`}
            >
              {ESTADOS.map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
            <Button onClick={aplicar}>Filtrar</Button>
            <Button
              variant="success"
              onClick={() => setModal({ tipo: "mens", mens: {} })}
            >
              <Plus size={16} className="mr-1" />
              Nueva
            </Button>
          </>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b text-slate-600">
                {[
                  "Placa / Estado",
                  "Titular",
                  "Valor",
                  "Inicio",
                  "Fin",
                  "Estado",
                  "Acciones",
                ].map((h) => (
                  <th key={h} className="px-3 py-2 font-semibold">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    Cargando…
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-red-600">
                    {error.userMessage}
                  </td>
                </tr>
              ) : filas.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    Sin registros
                  </td>
                </tr>
              ) : (
                filas.map((m) => (
                  <tr
                    key={m.id_mensualidad}
                    className="border-b border-slate-100 hover:bg-slate-50"
                  >
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <span className="rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-medium">
                          {m.placa}
                        </span>
                        <DueBadge m={m} />
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        {nextInfo(m)}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <div className="font-medium">{m.titular_nombre}</div>
                      <div className="text-xs text-slate-500">
                        {[m.titular_documento, m.titular_telefono]
                          .filter(Boolean)
                          .join(" • ")}
                      </div>
                    </td>
                    <td className="px-3 py-2">{fmtMoney(m.valor_mensual)}</td>
                    <td className="px-3 py-2">{fmtYmd(m.fecha_inicio)}</td>
                    <td className="px-3 py-2">{fmtYmd(m.fecha_fin)}</td>
                    <td className="px-3 py-2">
                      <Badge
                        tone={
                          m.estado === "activa"
                            ? "green"
                            : m.estado === "vencida"
                              ? "amber"
                              : "gray"
                        }
                      >
                        {m.estado}
                      </Badge>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2">
                      <div className="flex gap-1">
                        <button
                          title="Editar"
                          onClick={() => setModal({ tipo: "mens", mens: m })}
                          className="rounded border border-brand-600 p-1.5 text-brand-600 hover:bg-brand-600 hover:text-white"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          title="Registrar pago"
                          onClick={() => setModal({ tipo: "pago", mens: m })}
                          className="rounded border border-emerald-600 p-1.5 text-emerald-600 hover:bg-emerald-600 hover:text-white"
                        >
                          <DollarSign size={14} />
                        </button>
                        <button
                          title="Historial de pagos"
                          onClick={() => setModal({ tipo: "hist", mens: m })}
                          className="rounded border border-slate-400 p-1.5 text-slate-600 hover:bg-slate-600 hover:text-white"
                        >
                          <Receipt size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="mt-3 flex items-center justify-between text-sm">
          <Button
            variant="outline"
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
          >
            Anterior
          </Button>
          <span className="text-slate-500">
            Página {page} de {paginas}
          </span>
          <Button
            variant="outline"
            disabled={page >= paginas}
            onClick={() => setPage(page + 1)}
          >
            Siguiente
          </Button>
        </div>
      </Card>
      {modal?.tipo === "mens" && (
        <MensModal
          mens={modal.mens}
          tipos={tipos}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.tipo === "pago" && (
        <PagoModal mens={modal.mens} onClose={() => setModal(null)} />
      )}
      {modal?.tipo === "hist" && (
        <HistorialModal mens={modal.mens} onClose={() => setModal(null)} />
      )}
    </>
  );
}
