// frontend/src/pages/TarifasPage.jsx
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Save, CircleHelp } from "lucide-react";
import { api } from "../api/client";
import { useGet, useApiMutation } from "../hooks/useApi";
import { useFormat } from "../hooks/useEmpresa";
import Card from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import Modal from "../components/ui/Modal";
import { Field, FormError, inputCls } from "../components/ui/Field";
import { useToast } from "../components/ui/Toast";

const EMPTY = {
  id_tipo: "",
  modo_cobro: "mixto",
  valor_minuto: "",
  valor_hora: "",
  valor_dia_completo: "",
  paso_minutos_a_horas: "0",
  paso_horas_a_dias: "0",
  redondeo_horas: "arriba",
  redondeo_dias: "arriba",
};
const toForm = (t) => ({
  ...EMPTY,
  id_tipo: String(t.id_tipo),
  modo_cobro: t.modo_cobro,
  valor_minuto: t.valor_minuto,
  valor_hora: t.valor_hora,
  valor_dia_completo: t.valor_dia_completo,
  paso_minutos_a_horas: t.paso_minutos_a_horas,
  paso_horas_a_dias: t.paso_horas_a_dias,
  redondeo_horas: t.redondeo_horas,
  redondeo_dias: t.redondeo_dias,
});

function Ayuda({ onClose }) {
  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title="Ayuda para configurar Tarifas"
      footer={
        <Button variant="outline" onClick={onClose}>
          Cerrar
        </Button>
      }
    >
      <div className="space-y-4 text-sm text-slate-700">
        <section>
          <h3 className="mb-1 font-semibold">Modos de cobro</h3>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <b>Por minuto</b>: se cobra el valor minuto por cada minuto
              estacionado.
            </li>
            <li>
              <b>Por hora</b>: se cobra el valor hora por el total de horas,
              redondeando hacia arriba.
            </li>
            <li>
              <b>Por día</b>: se cobra el valor día por cada día, redondeando
              hacia arriba.
            </li>
            <li>
              <b>Mixto</b>: combina minuto, hora y día según los umbrales de
              abajo.
            </li>
          </ul>
        </section>
        <section>
          <h3 className="mb-1 font-semibold">Modo mixto</h3>
          <ol className="list-decimal space-y-1 pl-5">
            <li>
              <b>Hasta (min) cobrar por minuto</b>: si el tiempo no supera este
              valor, todo se cobra por minuto.
            </li>
            <li>
              Si lo supera, esos minutos se cobran por minuto y <b>el resto</b>{" "}
              se cobra por hora (con el redondeo de horas), hasta el máximo de
              horas definido en <b>«Luego (horas)»</b>.
            </li>
            <li>
              Lo que exceda ese máximo de horas se cobra por día (con el
              redondeo de días).
            </li>
          </ol>
          <div className="mt-2 rounded-lg bg-sky-50 p-3">
            <b>Ejemplo.</b> Minuto $100, hora $2.000, día $15.000, hasta 30 min,
            luego 5 horas, redondeo arriba. Para <b>1 h 10 min</b>: 30 min ×
            $100 + 1 hora × $2.000 = <b>$5.000</b>.
          </div>
        </section>
        <section>
          <h3 className="mb-1 font-semibold">Redondeo</h3>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <b>Arriba</b>: cualquier fracción sube a la siguiente hora (o
              día).
            </li>
            <li>
              <b>Exacto</b>: solo se cobran unidades completas.
            </li>
          </ul>
        </section>
        <section className="rounded-lg bg-slate-100 p-3">
          <b>Consejos.</b> Usa mixto para estancias cortas (minutos), medias
          (horas) y largas (días). Con redondeo «arriba» evitas cobros muy
          bajos. Ajusta los pasos a tu operación (por ejemplo 30 min y 5 horas).
        </section>
      </div>
    </Modal>
  );
}

export default function TarifasPage() {
  const toast = useToast();
  const { fmtMoney } = useFormat();
  const { data: tipos = [] } = useGet(
    ["tipos", "activos"],
    "/tipos-vehiculos/activos",
  );
  const { data: tarifas = [] } = useGet(["tarifas"], "/tarifas/current");
  const [ayuda, setAyuda] = useState(false);
  const [error, setError] = useState("");
  const { register, handleSubmit, watch, reset } = useForm({
    defaultValues: EMPTY,
  });
  const modo = watch("modo_cobro");
  const idTipo = watch("id_tipo");

  // Al elegir un tipo se carga su tarifa vigente (o se limpia el formulario para crear una).
  useEffect(() => {
    if (!idTipo) return reset(EMPTY);
    const t = tarifas.find((x) => String(x.id_tipo) === String(idTipo));
    reset(t ? toForm(t) : { ...EMPTY, id_tipo: idTipo });
  }, [idTipo, tarifas, reset]);

  const save = useApiMutation((v) => api.put("/tarifas", v), {
    invalidate: [["tarifas"]],
    silent: true,
  });
  const onSubmit = async (v) => {
    setError("");
    try {
      await save.mutateAsync(v);
      toast.success("Tarifa guardada");
    } catch (e) {
      setError(e.userMessage);
    }
  };

  const enMin = modo === "minuto" || modo === "mixto";
  const enHora = modo === "hora" || modo === "mixto";
  const enDia = modo === "dia" || modo === "mixto";
  const mixto = modo === "mixto";

  return (
    <div className="grid gap-6 xl:grid-cols-3">
      <Card
        className="xl:col-span-2"
        title="Configurar Tarifas"
        actions={
          <Button variant="outline" onClick={() => setAyuda(true)}>
            <CircleHelp size={14} className="mr-1" />
            Ayuda
          </Button>
        }
      >
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="grid gap-4 sm:grid-cols-3"
        >
          <FormError message={error} />
          <Field label="Tipo de vehículo" className="sm:col-span-1">
            <select className={inputCls} required {...register("id_tipo")}>
              <option value="">Seleccione un tipo</option>
              {tipos.map((t) => (
                <option key={t.id_tipo} value={t.id_tipo}>
                  {t.nombre}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Modo de cobro" className="sm:col-span-1">
            <select className={inputCls} {...register("modo_cobro")}>
              <option value="mixto">Mixto</option>
              <option value="minuto">Por minuto</option>
              <option value="hora">Por hora</option>
              <option value="dia">Por día</option>
            </select>
          </Field>
          <div className="hidden sm:block" />
          <Field label="Valor minuto">
            <input
              type="number"
              min="0"
              step="0.01"
              className={inputCls}
              disabled={!enMin}
              required={enMin}
              {...register("valor_minuto")}
            />
          </Field>
          <Field label="Valor hora">
            <input
              type="number"
              min="0"
              step="0.01"
              className={inputCls}
              disabled={!enHora}
              required={enHora}
              {...register("valor_hora")}
            />
          </Field>
          <Field label="Valor día">
            <input
              type="number"
              min="0"
              step="0.01"
              className={inputCls}
              disabled={!enDia}
              required={enDia}
              {...register("valor_dia_completo")}
            />
          </Field>
          <Field
            label="Hasta (min) cobrar por minuto"
            className="sm:col-span-1"
          >
            <input
              type="number"
              min="0"
              step="1"
              className={inputCls}
              disabled={!mixto}
              {...register("paso_minutos_a_horas")}
            />
          </Field>
          <Field
            label="Luego (horas) cobrar por hora antes de día"
            className="sm:col-span-1"
          >
            <input
              type="number"
              min="0"
              step="1"
              className={inputCls}
              disabled={!mixto}
              {...register("paso_horas_a_dias")}
            />
          </Field>
          <div className="hidden sm:block" />
          <Field label="Redondeo de horas">
            <select
              className={inputCls}
              disabled={!mixto}
              {...register("redondeo_horas")}
            >
              <option value="arriba">Arriba (ceil)</option>
              <option value="exacto">Exacto</option>
            </select>
          </Field>
          <Field label="Redondeo de días">
            <select
              className={inputCls}
              disabled={!mixto}
              {...register("redondeo_dias")}
            >
              <option value="arriba">Arriba (ceil)</option>
              <option value="exacto">Exacto</option>
            </select>
          </Field>
          <div className="flex items-end justify-end sm:col-span-3">
            <Button type="submit" loading={save.isPending}>
              <Save size={16} className="mr-1" />
              Guardar
            </Button>
          </div>
        </form>
      </Card>

      <Card title="Tarifas activas">
        <ul className="divide-y divide-slate-100">
          {tarifas.length === 0 && (
            <li className="py-4 text-center text-sm text-slate-500">
              Sin tarifas
            </li>
          )}
          {tarifas.map((t) => (
            <li key={t.id_tarifa} className="space-y-1 py-3 text-sm">
              <div className="flex items-center justify-between">
                <strong className="capitalize">{t.tipo_nombre}</strong>
                <Badge tone="blue">{t.modo_cobro}</Badge>
              </div>
              <div className="text-xs text-slate-600">
                Min: {fmtMoney(t.valor_minuto)} | Hora: {fmtMoney(t.valor_hora)}{" "}
                | Día: {fmtMoney(t.valor_dia_completo)}
              </div>
              <div className="text-xs text-slate-500">
                Escalas → min→hr: {t.paso_minutos_a_horas} min, hr→día:{" "}
                {t.paso_horas_a_dias} h
              </div>
            </li>
          ))}
        </ul>
      </Card>
      {ayuda && <Ayuda onClose={() => setAyuda(false)} />}
    </div>
  );
}
