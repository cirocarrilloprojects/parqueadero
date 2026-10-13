// frontend/src/pages/ReportesPage.jsx
import { useMemo, useState } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { keepPreviousData } from "@tanstack/react-query";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import {
  Banknote,
  Receipt,
  Calculator,
  ParkingSquare,
  Filter,
  FileText,
  FileSpreadsheet,
  CalendarDays,
  Printer,
  Users,
} from "lucide-react";
import api from "../api/client";
import { useGet } from "../hooks/useApi";
import { useEmpresa, useFormat } from "../hooks/useEmpresa";
import { buildTicketHtml } from "../components/tickets/ticketHtml";
import CierreTicket from "../components/turnos/CierreTicket";
import { printHtml } from "../utils/print";
import { descargar } from "../utils/download";
import { generarPdf } from "../utils/reportePdf";
import { addDaysYmd, fmtYmd, hoyYmd, mesYmd, qs } from "../utils/ymd";
import Card from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import Modal from "../components/ui/Modal";
import { inputCls } from "../components/ui/Field";
import { useToast } from "../components/ui/Toast";

const COLOR = {
  efectivo: "#198754",
  tarjeta: "#1a237e",
  QR: "#ffc107",
  transferencia: "#64748b",
};

function Kpi({ icon: Icon, color, titulo, valor, children }) {
  return (
    <div className="flex items-center gap-4 rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <div
        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-white ${color}`}
      >
        <Icon size={22} />
      </div>
      <div>
        <small className="text-slate-500">{titulo}</small>
        <div className="text-2xl font-bold">{valor}</div>
        {children}
      </div>
    </div>
  );
}

function CierresModal({ onClose, hoy }) {
  const fmt = useFormat();
  const toast = useToast();
  const { data: empresa } = useEmpresa();
  const [f, setF] = useState({ desde: hoy, hasta: hoy, usuario: "" });
  const [aplicado, setAplicado] = useState(f);
  const { data = [], isLoading } = useGet(
    ["reportes", "turnos", aplicado],
    `/reportes/turnos?${qs(aplicado)}`,
  );

  async function reimprimir(id, widthMm) {
    try {
      const { data: d } = await api.get(`/turnos/detalle/${id}`);
      const { turno: t, totales, stats } = d.data;
      const r = {
        turno: { id_turno: t.id_turno, usuario: t.usuario },
        base: Number(t.base_inicial),
        esperado: totales,
        stats,
        observacion: t.observacion_cierre,
        diferencia: Number(t.diferencia ?? 0),
        conteo: {
          efectivo: Number(t.total_efectivo ?? 0),
          tarjeta: Number(t.total_tarjeta ?? 0),
          qr: Number(t.total_qr ?? 0),
          total: Number(t.total_general ?? 0),
        },
      };
      printHtml(
        renderToStaticMarkup(
          <CierreTicket
            empresa={empresa}
            r={r}
            fmtMoney={fmt.fmtMoney}
            ahora={fmt.fmtDate(new Date().toISOString())}
          />,
        ),
        { widthMm, title: "Cierre de turno" },
      );
    } catch (e) {
      toast.error(e.userMessage ?? "No se pudo imprimir");
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      size="xl"
      title="Cierres de turno"
      footer={
        <Button variant="outline" onClick={onClose}>
          Cerrar
        </Button>
      }
    >
      <div className="mb-3 flex flex-wrap gap-2">
        <input
          type="date"
          className={`${inputCls} w-40!`}
          value={f.desde}
          onChange={(e) => setF({ ...f, desde: e.target.value })}
        />
        <input
          type="date"
          className={`${inputCls} w-40!`}
          value={f.hasta}
          onChange={(e) => setF({ ...f, hasta: e.target.value })}
        />
        <input
          placeholder="Usuario"
          className={`${inputCls} w-40!`}
          value={f.usuario}
          onChange={(e) => setF({ ...f, usuario: e.target.value })}
        />
        <Button onClick={() => setAplicado(f)}>
          <Filter size={14} className="mr-1" />
          Filtrar
        </Button>
        <Button
          variant="outline"
          onClick={() =>
            descargar(
              `/reportes/turnos/export/xlsx?${qs(aplicado)}`,
              "cierres_turno.xlsx",
            ).catch(() => toast.error("No se pudo exportar"))
          }
        >
          <FileSpreadsheet size={14} className="mr-1" />
          Excel
        </Button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b text-slate-600">
              {[
                "#",
                "Apertura",
                "Cierre",
                "Usuario",
                "Base",
                "Efectivo",
                "Tarjeta",
                "QR",
                "Total",
                "Diferencia",
                "",
              ].map((h) => (
                <th key={h} className="px-2 py-2 font-semibold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={11} className="py-6 text-center text-slate-500">
                  Cargando…
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={11} className="py-6 text-center text-slate-500">
                  Sin cierres en el rango
                </td>
              </tr>
            ) : (
              data.map((t) => (
                <tr key={t.id_turno} className="border-b border-slate-100">
                  <td className="px-2 py-2">{t.id_turno}</td>
                  <td className="px-2 py-2">{fmt.fmtDate(t.fecha_apertura)}</td>
                  <td className="px-2 py-2">
                    {t.fecha_cierre ? (
                      fmt.fmtDate(t.fecha_cierre)
                    ) : (
                      <Badge tone="green">Abierto</Badge>
                    )}
                  </td>
                  <td className="px-2 py-2">{t.usuario}</td>
                  <td className="px-2 py-2">{fmt.fmtMoney(t.base_inicial)}</td>
                  <td className="px-2 py-2">
                    {fmt.fmtMoney(t.total_efectivo ?? 0)}
                  </td>
                  <td className="px-2 py-2">
                    {fmt.fmtMoney(t.total_tarjeta ?? 0)}
                  </td>
                  <td className="px-2 py-2">{fmt.fmtMoney(t.total_qr ?? 0)}</td>
                  <td className="px-2 py-2 font-bold">
                    {fmt.fmtMoney(t.total_general ?? 0)}
                  </td>
                  <td
                    className={`px-2 py-2 ${Number(t.diferencia ?? 0) === 0 ? "text-emerald-600" : "text-red-600"}`}
                  >
                    {fmt.fmtMoney(t.diferencia ?? 0)}
                  </td>
                  <td className="whitespace-nowrap px-2 py-2">
                    {t.estado === "cerrado" && (
                      <>
                        <button
                          title="Imprimir 58 mm"
                          onClick={() => reimprimir(t.id_turno, 58)}
                          className="mr-1 rounded border border-brand-600 px-1.5 py-1 text-xs text-brand-600 hover:bg-brand-600 hover:text-white"
                        >
                          58
                        </button>
                        <button
                          title="Imprimir 80 mm"
                          onClick={() => reimprimir(t.id_turno, 80)}
                          className="rounded border border-brand-600 px-1.5 py-1 text-xs text-brand-600 hover:bg-brand-600 hover:text-white"
                        >
                          80
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Modal>
  );
}

function PorUsuarioModal({ onClose, hoy }) {
  const fmt = useFormat();
  const toast = useToast();
  const [f, setF] = useState({ desde: hoy, hasta: hoy });
  const [aplicado, setAplicado] = useState(f);
  const { data = [], isLoading } = useGet(
    ["reportes", "por-usuario", aplicado],
    `/reportes/por-usuario?${qs(aplicado)}`,
  );

  const totales = useMemo(() => {
    return data.reduce(
      (a, r) => ({
        tickets: a.tickets + r.tickets,
        efectivo: a.efectivo + r.efectivo,
        tarjeta: a.tarjeta + r.tarjeta,
        qr: a.qr + r.qr,
        transferencia: a.transferencia + r.transferencia,
        total: a.total + r.total,
      }),
      {
        tickets: 0,
        efectivo: 0,
        tarjeta: 0,
        qr: 0,
        transferencia: 0,
        total: 0,
      },
    );
  }, [data]);

  return (
    <Modal
      open
      onClose={onClose}
      size="xl"
      title="Ingresos por trabajador"
      footer={
        <Button variant="outline" onClick={onClose}>
          Cerrar
        </Button>
      }
    >
      <div className="mb-3 flex flex-wrap gap-2">
        <input
          type="date"
          className={`${inputCls} w-40!`}
          value={f.desde}
          onChange={(e) => setF({ ...f, desde: e.target.value })}
        />
        <input
          type="date"
          className={`${inputCls} w-40!`}
          value={f.hasta}
          onChange={(e) => setF({ ...f, hasta: e.target.value })}
        />
        <Button onClick={() => setAplicado(f)}>
          <Filter size={14} className="mr-1" />
          Filtrar
        </Button>
        <Button
          variant="outline"
          onClick={() => setAplicado({ desde: hoy, hasta: hoy })}
        >
          <CalendarDays size={14} className="mr-1" />
          Hoy
        </Button>
        <Button
          variant="outline"
          onClick={() =>
            setAplicado({ desde: addDaysYmd(hoy, -6), hasta: hoy })
          }
        >
          Últimos 7
        </Button>
        <Button
          variant="outline"
          onClick={() =>
            setAplicado({ desde: mesYmd(hoy)[0], hasta: mesYmd(hoy)[1] })
          }
        >
          Este mes
        </Button>
        <Button
          variant="outline"
          onClick={() =>
            descargar(
              `/reportes/por-usuario/export/xlsx?${qs(aplicado)}`,
              `ingresos_por_trabajador_${aplicado.desde}_${aplicado.hasta}.xlsx`,
            ).catch(() => toast.error("No se pudo exportar"))
          }
        >
          <FileSpreadsheet size={14} className="mr-1" />
          Excel
        </Button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b text-slate-600">
              {[
                "Trabajador",
                "Rol",
                "Tickets",
                "Efectivo",
                "Tarjeta",
                "QR",
                "Transferencia",
                "Total",
              ].map((h) => (
                <th key={h} className="px-2 py-2 font-semibold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={8} className="py-6 text-center text-slate-500">
                  Cargando…
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-6 text-center text-slate-500">
                  Sin ingresos en el rango
                </td>
              </tr>
            ) : (
              data.map((r) => (
                <tr key={r.id_usuario} className="border-b border-slate-100">
                  <td className="px-2 py-2">
                    <div className="font-medium">{r.nombre}</div>
                    <div className="text-xs text-slate-500">
                      {r.usuario_login}
                    </div>
                  </td>
                  <td className="px-2 py-2">
                    <Badge tone={r.rol === "admin" ? "blue" : "gray"}>
                      {r.rol.toUpperCase()}
                    </Badge>
                  </td>
                  <td className="px-2 py-2 text-right">{r.tickets}</td>
                  <td className="px-2 py-2 text-right">
                    {fmt.fmtMoney(r.efectivo)}
                  </td>
                  <td className="px-2 py-2 text-right">
                    {fmt.fmtMoney(r.tarjeta)}
                  </td>
                  <td className="px-2 py-2 text-right">{fmt.fmtMoney(r.qr)}</td>
                  <td className="px-2 py-2 text-right">
                    {fmt.fmtMoney(r.transferencia)}
                  </td>
                  <td className="px-2 py-2 text-right font-bold">
                    {fmt.fmtMoney(r.total)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
          {data.length > 0 && (
            <tfoot>
              <tr className="border-t-2 border-slate-300 font-bold">
                <td className="px-2 py-2" colSpan={2}>
                  TOTAL
                </td>
                <td className="px-2 py-2 text-right">{totales.tickets}</td>
                <td className="px-2 py-2 text-right">
                  {fmt.fmtMoney(totales.efectivo)}
                </td>
                <td className="px-2 py-2 text-right">
                  {fmt.fmtMoney(totales.tarjeta)}
                </td>
                <td className="px-2 py-2 text-right">
                  {fmt.fmtMoney(totales.qr)}
                </td>
                <td className="px-2 py-2 text-right">
                  {fmt.fmtMoney(totales.transferencia)}
                </td>
                <td className="px-2 py-2 text-right">
                  {fmt.fmtMoney(totales.total)}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </Modal>
  );
}

export default function ReportesPage() {
  const fmt = useFormat();
  const toast = useToast();
  const { data: empresa } = useEmpresa();
  const { data: tipos = [] } = useGet(
    ["tipos", "activos"],
    "/tipos-vehiculos/activos",
  );
  const hoy = hoyYmd(fmt.tz);
  const [f, setF] = useState({
    desde: hoy,
    hasta: hoy,
    tipo: "",
    estado: "",
    placa: "",
  });
  const [aplicado, setAplicado] = useState(f);
  const [metodo, setMetodo] = useState("");
  const [page, setPage] = useState(0);
  const [cierres, setCierres] = useState(false);
  const [porUsuario, setPorUsuario] = useState(false);
  const [busy, setBusy] = useState("");

  const rango = qs({ desde: aplicado.desde, hasta: aplicado.hasta });
  const { data: res } = useGet(
    ["reportes", "resumen", rango],
    `/reportes/resumen?${rango}`,
    { placeholderData: keepPreviousData },
  );
  const { data: top = [] } = useGet(
    ["reportes", "top", rango],
    `/reportes/top-placas?${rango}&top=10`,
  );
  const { data: movs, isLoading } = useGet(
    ["reportes", "mov", aplicado, page],
    `/reportes/movimientos?${qs({ ...aplicado, page, pageSize: 20 })}`,
    { placeholderData: keepPreviousData },
  );

  const k = res?.kpis;
  const serie = useMemo(
    () =>
      (res?.porDia ?? []).map((d) => ({
        fecha: d.fecha,
        valor: metodo ? (d[metodo] ?? 0) : d.total,
      })),
    [res, metodo],
  );
  const total = movs?.paging.total ?? 0;
  const paginas = Math.max(1, Math.ceil(total / 20));

  const aplicar = (n = f) => {
    setPage(0);
    setF(n);
    setAplicado(n);
  };
  const preset = (desde, hasta) => aplicar({ ...f, desde, hasta });

  async function reimprimir(id) {
    try {
      const { data } = await api.get(`/movimientos/${id}/ticket`);
      printHtml(buildTicketHtml(data.data, "SALIDA", fmt), {
        widthMm: 80,
        title: "Factura",
      });
    } catch (e) {
      toast.error(e.userMessage ?? "No se pudo reimprimir");
    }
  }
  async function exportar(tipo) {
    setBusy(tipo);
    try {
      if (tipo === "xlsx")
        await descargar(
          `/reportes/export/xlsx?${qs(aplicado)}`,
          `reporte_${aplicado.desde}_${aplicado.hasta}.xlsx`,
        );
      else {
        const { data } = await api.get(
          `/reportes/movimientos/export?${qs({ ...aplicado, limit: 1000 })}`,
        );
        await generarPdf({
          empresa,
          filtros: aplicado,
          rows: data.data.rows,
          resumen: data.data.resumen,
          fmt,
        });
      }
    } catch (e) {
      toast.error(e.userMessage ?? "No se pudo exportar");
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="space-y-6">
      <Card
        title="Filtros de reporte"
        actions={
          <>
            <Button variant="outline" onClick={() => setPorUsuario(true)}>
              <Users size={14} className="mr-1" />
              Ingresos por trabajador
            </Button>
            <Button variant="outline" onClick={() => setCierres(true)}>
              <Banknote size={14} className="mr-1" />
              Cierres de turno
            </Button>
          </>
        }
      >
        <div className="flex flex-wrap items-end gap-2">
          <input
            type="date"
            aria-label="Desde"
            className={`${inputCls} w-40!`}
            value={f.desde}
            onChange={(e) => setF({ ...f, desde: e.target.value })}
          />
          <input
            type="date"
            aria-label="Hasta"
            className={`${inputCls} w-40!`}
            value={f.hasta}
            onChange={(e) => setF({ ...f, hasta: e.target.value })}
          />
          <select
            className={`${inputCls} w-44!`}
            value={f.tipo}
            onChange={(e) => setF({ ...f, tipo: e.target.value })}
          >
            <option value="">Todos los tipos</option>
            {tipos.map((t) => (
              <option key={t.id_tipo} value={t.codigo}>
                {t.nombre}
              </option>
            ))}
          </select>
          <select
            className={`${inputCls} w-44!`}
            value={f.estado}
            onChange={(e) => setF({ ...f, estado: e.target.value })}
          >
            <option value="">Todos los estados</option>
            <option value="activo">Activos</option>
            <option value="finalizado">Finalizados</option>
          </select>
          <input
            placeholder="Placa"
            className={`${inputCls} w-32! uppercase`}
            value={f.placa}
            onChange={(e) => setF({ ...f, placa: e.target.value })}
          />
          <Button onClick={() => aplicar()}>
            <Filter size={14} className="mr-1" />
            Aplicar
          </Button>
          <Button variant="outline" onClick={() => preset(hoy, hoy)}>
            <CalendarDays size={14} className="mr-1" />
            Hoy
          </Button>
          <Button
            variant="outline"
            onClick={() => preset(addDaysYmd(hoy, -6), hoy)}
          >
            Últimos 7
          </Button>
          <Button variant="outline" onClick={() => preset(...mesYmd(hoy))}>
            Este mes
          </Button>
          <Button
            variant="success"
            loading={busy === "pdf"}
            onClick={() => exportar("pdf")}
          >
            <FileText size={14} className="mr-1" />
            Exportar PDF
          </Button>
          <Button
            variant="outline"
            loading={busy === "xlsx"}
            onClick={() => exportar("xlsx")}
          >
            <FileSpreadsheet size={14} className="mr-1" />
            Exportar Excel
          </Button>
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi
          icon={Banknote}
          color="bg-emerald-600"
          titulo="Ingresos total"
          valor={fmt.fmtMoney(k?.ingresos ?? 0)}
        >
          <div className="mt-1 flex gap-3 text-xs text-slate-500">
            <span>
              Parqueo: <b>{fmt.fmtMoney(k?.ingresosMov ?? 0)}</b>
            </span>
            <span>
              Mensual:{" "}
              <b className="text-brand-600">
                {fmt.fmtMoney(k?.ingresosMens ?? 0)}
              </b>
            </span>
          </div>
        </Kpi>
        <Kpi
          icon={Receipt}
          color="bg-brand-600"
          titulo="Tickets"
          valor={k?.tickets ?? 0}
        />
        <Kpi
          icon={Calculator}
          color="bg-sky-500"
          titulo="Promedio ticket"
          valor={fmt.fmtMoney(k?.promedioTicket ?? 0)}
        />
        <Kpi
          icon={ParkingSquare}
          color="bg-amber-500"
          titulo="Ocupación"
          valor={`${k?.ocupacion ?? 0}%`}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card
          className="xl:col-span-2"
          title="Ingresos por día"
          actions={
            <select
              className={`${inputCls} w-44! py-1!`}
              value={metodo}
              onChange={(e) => setMetodo(e.target.value)}
            >
              <option value="">Todos los métodos</option>
              <option value="efectivo">Efectivo</option>
              <option value="tarjeta">Tarjeta</option>
              <option value="QR">QR</option>
              <option value="transferencia">Transferencia</option>
            </select>
          }
        >
          {serie.length === 0 ? (
            <p className="py-16 text-center text-sm text-slate-500">
              Sin ingresos en el rango
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={serie}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="fecha" tickFormatter={fmtYmd} fontSize={12} />
                <YAxis
                  tickFormatter={(v) => fmt.fmtMoney(v)}
                  width={90}
                  fontSize={12}
                />
                <Tooltip
                  formatter={(v) => fmt.fmtMoney(v)}
                  labelFormatter={fmtYmd}
                />
                <Line
                  type="monotone"
                  dataKey="valor"
                  name="Ingresos"
                  stroke="#1a237e"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </Card>
        <Card title="Ingresos por método">
          {(res?.porMetodo ?? []).length === 0 ? (
            <p className="py-16 text-center text-sm text-slate-500">
              Sin datos
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={res.porMetodo}
                  dataKey="total"
                  nameKey="metodo_pago"
                  innerRadius={55}
                  outerRadius={85}
                >
                  {res.porMetodo.map((m) => (
                    <Cell
                      key={m.metodo_pago}
                      fill={COLOR[m.metodo_pago] ?? "#94a3b8"}
                    />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => fmt.fmtMoney(v)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      <Card
        title="Movimientos"
        actions={<span className="text-xs text-slate-500">Total: {total}</span>}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b text-slate-600">
                {[
                  "#Mov",
                  "Placa",
                  "Tipo",
                  "Entrada",
                  "Salida",
                  "Estado",
                  "Total",
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
                  <td colSpan={8} className="py-6 text-center text-slate-500">
                    Cargando…
                  </td>
                </tr>
              ) : !movs?.rows.length ? (
                <tr>
                  <td colSpan={8} className="py-6 text-center text-slate-500">
                    Sin registros
                  </td>
                </tr>
              ) : (
                movs.rows.map((m) => (
                  <tr
                    key={m.id_movimiento}
                    className="border-b border-slate-100 hover:bg-slate-50"
                  >
                    <td className="px-3 py-2">{m.id_movimiento}</td>
                    <td className="px-3 py-2 font-medium">{m.placa}</td>
                    <td className="px-3 py-2">{m.tipo}</td>
                    <td className="px-3 py-2">
                      {fmt.fmtDate(m.fecha_entrada)}
                    </td>
                    <td className="px-3 py-2">
                      {m.fecha_salida ? fmt.fmtDate(m.fecha_salida) : "-"}
                    </td>
                    <td className="px-3 py-2">
                      <Badge tone={m.estado === "activo" ? "green" : "gray"}>
                        {m.estado}
                      </Badge>
                    </td>
                    <td className="px-3 py-2">
                      {m.total_a_pagar != null
                        ? fmt.fmtMoney(m.total_a_pagar)
                        : "-"}
                    </td>
                    <td className="px-3 py-2">
                      {m.estado === "finalizado" && (
                        <button
                          title="Reimprimir factura"
                          onClick={() => reimprimir(m.id_movimiento)}
                          className="rounded border border-brand-600 p-1.5 text-brand-600 hover:bg-brand-600 hover:text-white"
                        >
                          <Printer size={14} />
                        </button>
                      )}
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
            disabled={page <= 0}
            onClick={() => setPage(page - 1)}
          >
            Anterior
          </Button>
          <span className="text-slate-500">
            Página {page + 1} de {paginas}
          </span>
          <Button
            variant="outline"
            disabled={page >= paginas - 1}
            onClick={() => setPage(page + 1)}
          >
            Siguiente
          </Button>
        </div>
      </Card>

      <Card title="Top placas">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b text-slate-600">
              {["Placa", "Tipo", "Visitas", "Total"].map((h) => (
                <th key={h} className="px-3 py-2 font-semibold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {top.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-6 text-center text-slate-500">
                  Sin registros
                </td>
              </tr>
            ) : (
              top.map((p) => (
                <tr key={p.placa} className="border-b border-slate-100">
                  <td className="px-3 py-2 font-medium">{p.placa}</td>
                  <td className="px-3 py-2">{p.tipo}</td>
                  <td className="px-3 py-2">{p.visitas}</td>
                  <td className="px-3 py-2">{fmt.fmtMoney(p.total)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>
      {cierres && <CierresModal hoy={hoy} onClose={() => setCierres(false)} />}
      {porUsuario && (
        <PorUsuarioModal hoy={hoy} onClose={() => setPorUsuario(false)} />
      )}
    </div>
  );
}
