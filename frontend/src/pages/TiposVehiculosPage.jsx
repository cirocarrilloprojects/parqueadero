// frontend/src/pages/TiposVehiculosPage.jsx
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Plus, Pencil, Trash2, Tags } from "lucide-react";
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

function TipoModal({ tipo, onClose }) {
  const toast = useToast();
  const [error, setError] = useState("");
  const { register, handleSubmit } = useForm({
    defaultValues: {
      nombre: tipo.nombre ?? "",
      codigo: tipo.codigo ?? "",
      capacidad: tipo.capacidad ?? "",
      activo: tipo.activo === undefined ? true : !!tipo.activo,
    },
  });
  const save = useApiMutation(
    (v) =>
      tipo.id_tipo
        ? api.put(`/tipos-vehiculos/${tipo.id_tipo}`, v)
        : api.post("/tipos-vehiculos", v),
    { invalidate: [["tipos"]], silent: true },
  );

  const onSubmit = async (v) => {
    setError("");
    try {
      await save.mutateAsync({
        ...v,
        capacidad: v.capacidad === "" ? 0 : Number(v.capacidad),
      });
      toast.success(
        tipo.id_tipo
          ? "Tipo de vehículo actualizado"
          : "Tipo de vehículo registrado",
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
      title={
        tipo.id_tipo ? "Editar Tipo de Vehículo" : "Nuevo Tipo de Vehículo"
      }
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="tipo-form" loading={save.isPending}>
            Guardar
          </Button>
        </>
      }
    >
      <form
        id="tipo-form"
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-4"
      >
        <FormError message={error} />
        <Field label="Nombre *" hint="Nombre descriptivo del tipo de vehículo">
          <input
            className={inputCls}
            required
            placeholder="Ej: Carro, Moto, Bicicleta"
            {...register("nombre")}
          />
        </Field>
        <Field
          label="Código *"
          hint="Código único (se normaliza a minúsculas y sin espacios)"
        >
          <input
            className={inputCls}
            required
            placeholder="Ej: carro, moto, bici"
            {...register("codigo")}
          />
        </Field>
        <Field
          label="Capacidad total"
          hint="Máximo de vehículos de este tipo que puede albergar el parqueadero"
        >
          <input
            type="number"
            min="0"
            className={inputCls}
            placeholder="Ej: 50"
            {...register("capacidad")}
          />
        </Field>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="h-4 w-4 accent-brand-600"
            {...register("activo")}
          />
          Activo
          <span className="text-xs text-slate-500">
            (los inactivos no aparecen en el ingreso)
          </span>
        </label>
      </form>
    </Modal>
  );
}

export default function TiposVehiculosPage() {
  const toast = useToast();
  const { fmtDate } = useFormat();
  const { data = [], isLoading } = useGet(
    ["tipos", "lista"],
    "/tipos-vehiculos",
  );
  const [editing, setEditing] = useState(null);
  const [toDelete, setToDelete] = useState(null);
  const del = useApiMutation((id) => api.delete(`/tipos-vehiculos/${id}`), {
    invalidate: [["tipos"]],
    onSuccess: () => {
      toast.success("Tipo de vehículo eliminado");
      setToDelete(null);
    },
  });

  const columns = [
    { key: "nombre", header: "Nombre" },
    {
      key: "codigo",
      header: "Código",
      render: (t) => (
        <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">
          {t.codigo}
        </code>
      ),
    },
    { key: "capacidad", header: "Capacidad" },
    { key: "total_vehiculos", header: "Total Vehículos" },
    {
      key: "tiene_tarifa_activa",
      header: "Tarifa Activa",
      render: (t) => (
        <Badge tone={t.tiene_tarifa_activa > 0 ? "green" : "amber"}>
          {t.tiene_tarifa_activa > 0 ? "Sí" : "No"}
        </Badge>
      ),
    },
    {
      key: "activo",
      header: "Estado",
      render: (t) => (
        <Badge tone={t.activo ? "green" : "gray"}>
          {t.activo ? "Activo" : "Inactivo"}
        </Badge>
      ),
    },
    {
      key: "fecha_creacion",
      header: "Fecha Creación",
      render: (t) => fmtDate(t.fecha_creacion),
    },
    {
      key: "acciones",
      header: "Acciones",
      sortable: false,
      searchable: false,
      render: (t) => (
        <div className="flex gap-1">
          <button
            title="Editar"
            onClick={() => setEditing(t)}
            className="rounded bg-sky-500 p-1.5 text-white hover:bg-sky-600"
          >
            <Pencil size={14} />
          </button>
          <button
            title="Eliminar"
            onClick={() => setToDelete(t)}
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
        title="Gestión de Tipos de Vehículos"
        icon={Tags}
        actions={
          <Button onClick={() => setEditing({})}>
            <Plus size={16} className="mr-1" />
            Nuevo Tipo
          </Button>
        }
      >
        <DataTable
          columns={columns}
          rows={data}
          loading={isLoading}
          defaultSort={{ key: "fecha_creacion", dir: "desc" }}
        />
      </Card>
      {editing && <TipoModal tipo={editing} onClose={() => setEditing(null)} />}
      <ConfirmDialog
        open={!!toDelete}
        title="Eliminar tipo de vehículo"
        confirmText="Eliminar"
        loading={del.isPending}
        message={`¿Eliminar «${toDelete?.nombre}»?\n\nNo se puede eliminar si tiene vehículos asociados o tarifas.`}
        onConfirm={() => del.mutate(toDelete.id_tipo)}
        onClose={() => setToDelete(null)}
      />
    </>
  );
}
