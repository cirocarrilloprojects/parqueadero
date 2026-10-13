// frontend/src/pages/DashboardPage.jsx
import { useState } from "react";
import { Link } from "react-router-dom";
import { keepPreviousData } from "@tanstack/react-query";
import {
  Car,
  Banknote,
  ParkingSquare,
  Eye,
  PlusCircle,
  Printer,
  ChartBar,
} from "lucide-react";
import { useGet } from "../hooks/useApi";
import { useFormat } from "../hooks/useEmpresa";
import { useAuth } from "../context/AuthContext";
import { useTicket } from "../components/tickets/ComprobantePanel";
import { buildTicketHtml } from "../components/tickets/ticketHtml";
import { printHtml } from "../utils/print";
import Card from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import Modal from "../components/ui/Modal";

function StatCard({ icon: Icon, color, title, children }) {
  return (
    <div className="flex items-center gap-4 rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200 transition-transform hover:-translate-y-1">
      <div
        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-white ${color}`}
      >
        <Icon size={24} />
      </div>
      <div className="min-w-0">
        <h3 className="mb-1 text-sm text-slate-500">{title}</h3>
        {children}
      </div>
    </div>
  );
}

function DetalleModal({ id, onClose }) {
  const { data, isLoading } = useTicket(id);
  const fmt = useFormat();
  const tipo = data?.movimiento.estado === "finalizado" ? "SALIDA" : "INGRESO";
  const imprimir = (w) =>
    printHtml(buildTicketHtml(data, tipo, fmt), {
      widthMm: w,
      title: "Comprobante",
    });
  return (
    <Modal
      open
      onClose={onClose}
      title={`Detalle Movimiento #${id}`}
      footer={
        <>
          {data && (
            <>
              <Button variant="outline" onClick={() => imprimir(58)}>
                <Printer size={14} className="mr-1" />
                58 mm
              </Button>
              <Button variant="outline" onClick={() => imprimir(80)}>
                <Printer size={14} className="mr-1" />
                80 mm
              </Button>
            </>
          )}
          <Button variant="outline" onClick={onClose}>
            Cerrar
          </Button>
        </>
      }
    >
      {isLoading || !data ? (
        <p className="py-4 text-center text-sm text-slate-500">Cargando…</p>
      ) : (
        <dl className="grid grid-cols-3 gap-2 text-sm">
          <dt className="text-slate-500">Placa</dt>
          <dd className="col-span-2 font-medium">{data.vehiculo.placa}</dd>
          <dt className="text-slate-500">Tipo</dt>
          <dd className="col-span-2">{data.vehiculo.tipo}</dd>
          <dt className="text-slate-500">Entrada</dt>
          <dd className="col-span-2">
            {fmt.fmtDate(data.movimiento.fecha_entrada)}
          </dd>
          {data.movimiento.fecha_salida && (
            <>
              <dt className="text-slate-500">Salida</dt>
              <dd className="col-span-2">
                {fmt.fmtDate(data.movimiento.fecha_salida)}
              </dd>
            </>
          )}
          {data.movimiento.total != null && (
            <>
              <dt className="text-slate-500">Total</dt>
              <dd className="col-span-2 font-medium">
                {fmt.fmtMoney(data.movimiento.total)}
              </dd>
            </>
          )}
        </dl>
      )}
    </Modal>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { fmtMoney, fmtDate } = useFormat();
  const [page, setPage] = useState(0);
  const [detalle, setDetalle] = useState(null);
  const { data, isLoading, error } = useGet(
    ["dashboard", page],
    `/dashboard/stats?page=${page}&pageSize=5`,
    { placeholderData: keepPreviousData },
  );

  return (
    <>
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          icon={Car}
          color="bg-brand-600"
          title="Vehículos actuales (por tipo)"
        >
          <div className="flex flex-wrap gap-x-5 gap-y-1">
            {(data?.porTipo ?? []).map((t) => (
              <div key={t.id_tipo}>
                <small className="text-slate-500">{t.nombre}</small>
                <div className="text-2xl font-bold">{t.cantidad}</div>
              </div>
            ))}
            {!isLoading && data?.porTipo?.length === 0 && (
              <span className="text-sm text-slate-500">Sin tipos activos</span>
            )}
          </div>
        </StatCard>
        <StatCard icon={Banknote} color="bg-emerald-600" title="Ingresos hoy">
          <div className="text-3xl font-semibold">
            {fmtMoney(data?.ingresosHoy ?? 0)}
          </div>
        </StatCard>
        <StatCard icon={ParkingSquare} color="bg-amber-500" title="Ocupación">
          <div className="text-3xl font-semibold">{data?.ocupacion ?? 0}%</div>
        </StatCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2" title="Actividad reciente">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b text-slate-600">
                  {["Placa", "Tipo", "Entrada", "Estado", "Acciones"].map(
                    (h) => (
                      <th key={h} className="px-3 py-2 font-semibold">
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-slate-500">
                      Cargando…
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-red-600">
                      {error.userMessage ?? "No se pudo cargar el dashboard"}
                    </td>
                  </tr>
                ) : !data?.actividad?.length ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-slate-500">
                      No hay actividad reciente
                    </td>
                  </tr>
                ) : (
                  data.actividad.map((a) => (
                    <tr
                      key={a.id}
                      className="border-b border-slate-100 hover:bg-slate-50"
                    >
                      <td className="px-3 py-2 font-medium">{a.placa}</td>
                      <td className="px-3 py-2">{a.tipo}</td>
                      <td className="px-3 py-2">{fmtDate(a.entrada)}</td>
                      <td className="px-3 py-2">
                        <Badge tone={a.estado === "activo" ? "green" : "gray"}>
                          {a.estado}
                        </Badge>
                      </td>
                      <td className="px-3 py-2">
                        <button
                          title="Ver detalle"
                          onClick={() => setDetalle(a.id)}
                          className="rounded bg-brand-600 p-1.5 text-white hover:opacity-90"
                        >
                          <Eye size={14} />
                        </button>
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
              disabled={page === 0}
              onClick={() => setPage(page - 1)}
            >
              Anterior
            </Button>
            <span className="text-slate-500">Página {page + 1}</span>
            <Button
              variant="outline"
              disabled={!data?.paging.hasNext}
              onClick={() => setPage(page + 1)}
            >
              Siguiente
            </Button>
          </div>
        </Card>

        <Card title="Acciones rápidas">
          <div className="grid gap-3">
            <Link
              to="/admin/ingreso-salida"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-4 text-white hover:opacity-90"
            >
              <PlusCircle size={18} />
              Registrar Ingreso / Salida
            </Link>
            {user?.rol === "admin" && (
              <Link
                to="/admin/reportes"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-sky-500 px-4 py-4 text-white hover:opacity-90"
              >
                <ChartBar size={18} />
                Generar Reporte
              </Link>
            )}
          </div>
        </Card>
      </div>
      {detalle && (
        <DetalleModal id={detalle} onClose={() => setDetalle(null)} />
      )}
    </>
  );
}
