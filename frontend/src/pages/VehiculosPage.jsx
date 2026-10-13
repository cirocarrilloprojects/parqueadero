// frontend/src/pages/VehiculosPage.jsx
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Plus, Pencil, Trash2, Car } from "lucide-react";
import { api } from "../api/client";
import { useGet, useApiMutation } from "../hooks/useApi";
import { useFormat } from "../hooks/useEmpresa";
import Card from "../components/ui/Card";
import DataTable from "../components/ui/DataTable";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import Modal from "../components/ui/Modal";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import { Field, FormError, inputCls } from "../components/ui/Field";
import { useToast } from "../components/ui/Toast";

function VehiculoModal({ vehiculo, tipos, onClose }) {
  const toast = useToast();
  const [error, setError] = useState("");
  const { register, handleSubmit } = useForm({
    defaultValues: {
      placa: vehiculo.placa ?? "",
      id_tipo: vehiculo.id_tipo ?? "",
      color: vehiculo.color ?? "",
      modelo: vehiculo.modelo ?? "",
    },
  });
  const save = useApiMutation(
    (v) =>
      vehiculo.id_vehiculo
        ? api.put(`/vehiculos/${vehiculo.id_vehiculo}`, v)
        : api.post("/vehiculos", v),
    { invalidate: [["vehiculos"]], silent: true },
  );
  const onSubmit = async (v) => {
    setError("");
    try {
      await save.mutateAsync(v);
      toast.success(
        vehiculo.id_vehiculo ? "Vehículo actualizado" : "Vehículo registrado",
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
      title={vehiculo.id_vehiculo ? "Editar Vehículo" : "Nuevo Vehículo"}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="veh-form" loading={save.isPending}>
            Guardar
          </Button>
        </>
      }
    >
      <form
        id="veh-form"
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-4"
      >
        <FormError message={error} />
        <Field label="Placa">
          <input
            className={`${inputCls} uppercase`}
            required
            maxLength={10}
            {...register("placa")}
          />
        </Field>
        <Field label="Tipo">
          <select className={inputCls} required {...register("id_tipo")}>
            <option value="">Seleccione un tipo</option>
            {tipos.map((t) => (
              <option key={t.id_tipo} value={t.id_tipo}>
                {t.nombre}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Color">
          <input className={inputCls} required {...register("color")} />
        </Field>
        <Field label="Modelo">
          <input className={inputCls} {...register("modelo")} />
        </Field>
      </form>
    </Modal>
  );
}

function HistorialModal({ vehiculo, onClose }) {
  const { fmtMoney, fmtDate } = useFormat();
  const { data = [], isLoading } = useGet(
    ["vehiculos", "historial", vehiculo.id_vehiculo],
    `/vehiculos/${vehiculo.id_vehiculo}/historial`,
  );
  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={`Historial del Vehículo ${vehiculo.placa}`}
      footer={
        <Button variant="outline" onClick={onClose}>
          Cerrar
        </Button>
      }
    >
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b text-slate-600">
              {["#Mov", "Entrada", "Salida", "Estado", "Total", "Pagos"].map(
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
                <td colSpan={6} className="py-6 text-center text-slate-500">
                  Cargando...
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-6 text-center text-slate-500">
                  Sin registros
                </td>
              </tr>
            ) : (
              data.map((m) => {
                const vuelto =
                  Number(m.total_recibido) - Number(m.total_pagado);
                return (
                  <tr
                    key={m.id_movimiento}
                    className="border-b border-slate-100"
                  >
                    <td className="px-3 py-2">{m.id_movimiento}</td>
                    <td className="px-3 py-2">{fmtDate(m.fecha_entrada)}</td>
                    <td className="px-3 py-2">
                      {m.fecha_salida ? fmtDate(m.fecha_salida) : "-"}
                    </td>
                    <td className="px-3 py-2">
                      <Badge tone={m.estado === "activo" ? "green" : "blue"}>
                        {m.estado}
                      </Badge>
                    </td>
                    <td className="px-3 py-2">
                      {m.total_a_pagar ? fmtMoney(m.total_a_pagar) : "-"}
                    </td>
                    <td className="px-3 py-2">
                      {m.pagos > 0 ? (
                        <>
                          {fmtMoney(m.total_pagado)} ({m.pagos})
                          {vuelto > 0 && (
                            <div className="text-xs text-emerald-600">
                              Vuelto: {fmtMoney(vuelto)}
                            </div>
                          )}
                        </>
                      ) : (
                        "-"
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </Modal>
  );
}

export default function VehiculosPage() {
  const toast = useToast();
  const { fmtDate } = useFormat();
  const { data = [], isLoading } = useGet(["vehiculos", "lista"], "/vehiculos");
  const { data: tipos = [] } = useGet(
    ["tipos", "activos"],
    "/tipos-vehiculos/activos",
  );
  const [filtroTipo, setFiltroTipo] = useState("");
  const [editing, setEditing] = useState(null);
  const [historial, setHistorial] = useState(null);
  const [toDelete, setToDelete] = useState(null);
  const del = useApiMutation((id) => api.delete(`/vehiculos/${id}`), {
    invalidate: [["vehiculos"]],
    onSuccess: () => {
      toast.success("Vehículo eliminado");
      setToDelete(null);
    },
  });

  const rows = filtroTipo
    ? data.filter((v) => String(v.id_tipo) === filtroTipo)
    : data;
  const columns = [
    {
      key: "placa",
      header: "Placa",
      render: (v) => (
        <button
          className="font-medium text-brand-600 hover:underline"
          onClick={() => setHistorial(v)}
        >
          {v.placa}
        </button>
      ),
    },
    { key: "tipo", header: "Tipo" },
    { key: "color", header: "Color" },
    { key: "modelo", header: "Modelo" },
    {
      key: "fecha_registro",
      header: "Fecha Registro",
      render: (v) => fmtDate(v.fecha_registro),
    },
    {
      key: "estado",
      header: "Estado",
      render: (v) => (
        <Badge tone={v.estado === "activo" ? "green" : "gray"}>
          {v.estado === "activo" ? "Activo" : "Inactivo"}
        </Badge>
      ),
    },
    {
      key: "acciones",
      header: "Acciones",
      sortable: false,
      searchable: false,
      render: (v) => (
        <div className="flex gap-1">
          <button
            title="Editar"
            onClick={() => setEditing(v)}
            className="rounded bg-sky-500 p-1.5 text-white hover:bg-sky-600"
          >
            <Pencil size={14} />
          </button>
          <button
            title="Eliminar"
            onClick={() => setToDelete(v)}
            className="rounded bg-red-500 p-1.5 text-white hover:bg-red-600"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <>
      <Card
        title="Gestión de Vehículos"
        icon={Car}
        actions={
          <Button onClick={() => setEditing({})}>
            <Plus size={16} className="mr-1" />
            Nuevo Vehículo
          </Button>
        }
      >
        <DataTable
          columns={columns}
          rows={rows}
          loading={isLoading}
          defaultSort={{ key: "fecha_registro", dir: "desc" }}
          toolbar={
            <select
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value)}
              className={`${inputCls} w-48!`}
            >
              <option value="">Todos los tipos</option>
              {tipos.map((t) => (
                <option key={t.id_tipo} value={t.id_tipo}>
                  {t.nombre}
                </option>
              ))}
            </select>
          }
        />
      </Card>
      {editing && (
        <VehiculoModal
          vehiculo={editing}
          tipos={tipos}
          onClose={() => setEditing(null)}
        />
      )}
      {historial && (
        <HistorialModal
          vehiculo={historial}
          onClose={() => setHistorial(null)}
        />
      )}
      <ConfirmDialog
        open={!!toDelete}
        title="Eliminar vehículo"
        confirmText="Eliminar"
        loading={del.isPending}
        message={`¿Eliminar el vehículo ${toDelete?.placa}?`}
        onConfirm={() => del.mutate(toDelete.id_vehiculo)}
        onClose={() => setToDelete(null)}
      />
    </>
  );
}
