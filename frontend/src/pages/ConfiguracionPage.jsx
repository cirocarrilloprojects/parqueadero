// frontend/src/pages/ConfiguracionPage.jsx
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import {
  Building2,
  SlidersHorizontal,
  Save,
  Upload,
  LocateFixed,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";
import { useApiMutation } from "../hooks/useApi";
import { useEmpresa, useEmpresaConfig } from "../hooks/useEmpresa";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import { Field, FormError, inputCls } from "../components/ui/Field";
import { useToast } from "../components/ui/Toast";

const ZONAS = [
  ["America/Mexico_City", "México (Ciudad de México)"],
  ["America/Cancun", "México (Cancún)"],
  ["America/Tijuana", "México (Tijuana)"],
  ["America/Bogota", "Colombia (Bogotá)"],
  ["America/Lima", "Perú (Lima)"],
  ["America/Guayaquil", "Ecuador (Guayaquil)"],
  ["America/Caracas", "Venezuela (Caracas)"],
  ["America/La_Paz", "Bolivia (La Paz)"],
  ["America/Santiago", "Chile (Santiago)"],
  ["America/Argentina/Buenos_Aires", "Argentina (Buenos Aires)"],
  ["America/Asuncion", "Paraguay (Asunción)"],
  ["America/Montevideo", "Uruguay (Montevideo)"],
  ["America/Panama", "Panamá"],
  ["America/Costa_Rica", "Costa Rica"],
  ["America/Guatemala", "Guatemala"],
  ["America/El_Salvador", "El Salvador"],
  ["America/Tegucigalpa", "Honduras"],
  ["America/Managua", "Nicaragua"],
  ["America/Santo_Domingo", "República Dominicana"],
  ["America/Havana", "Cuba (La Habana)"],
  ["America/New_York", "EE.UU. (Nueva York)"],
  ["America/Chicago", "EE.UU. (Chicago)"],
  ["America/Denver", "EE.UU. (Denver)"],
  ["America/Los_Angeles", "EE.UU. (Los Ángeles)"],
  ["Europe/Madrid", "España (Madrid)"],
  ["Atlantic/Canary", "España (Canarias)"],
  ["UTC", "UTC"],
];
const hhmm = (t) => String(t ?? "").slice(0, 5);
const LOGO_URL = `${import.meta.env.VITE_API_URL ?? "/api"}/empresa/logo`;

function LogoUploader({ tieneLogo }) {
  const qc = useQueryClient();
  const toast = useToast();
  const input = useRef(null);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [v, setV] = useState(() => Date.now());
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => () => preview && URL.revokeObjectURL(preview), [preview]);

  function onPick(e) {
    const f = e.target.files?.[0];
    setError("");
    if (!f) return (setFile(null), setPreview(null));
    if (!["image/png", "image/jpeg", "image/gif"].includes(f.type)) {
      e.target.value = "";
      return setError("Tipo de archivo no permitido. Usa PNG o JPG.");
    }
    if (f.size > 2 * 1024 * 1024) {
      e.target.value = "";
      return setError("El archivo excede 2 MB.");
    }
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }

  async function subir() {
    if (!file) return setError("Selecciona un archivo de logo.");
    setBusy(true);
    setError("");
    try {
      const form = new FormData();
      form.append("logo", file);
      await api.post("/empresa/logo", form);
      await qc.invalidateQueries({ queryKey: ["empresa", "me"] });
      setV(Date.now());
      setFile(null);
      setPreview(null);
      if (input.current) input.current.value = "";
      toast.success("Logo subido y guardado");
    } catch (e) {
      setError(e.userMessage);
    } finally {
      setBusy(false);
    }
  }

  const src = preview ?? (tieneLogo ? `${LOGO_URL}?v=${v}` : null);
  return (
    <div className="space-y-2">
      <FormError message={error} />
      <Field label="Logo">
        <input
          ref={input}
          type="file"
          accept="image/png,image/jpeg,image/gif"
          onChange={onPick}
          className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2"
        />
      </Field>
      {src && (
        <img
          src={src}
          alt="Vista previa del logo"
          className="max-h-20 rounded border border-slate-200"
        />
      )}
      <Button variant="outline" onClick={subir} loading={busy}>
        <Upload size={14} className="mr-1" />
        Subir
      </Button>
    </div>
  );
}

function EmpresaCard() {
  const toast = useToast();
  const { data: e } = useEmpresa();
  const [error, setError] = useState("");
  const { register, handleSubmit, reset } = useForm();
  useEffect(() => {
    if (e)
      reset({
        nombre: e.nombre,
        nit: e.nit,
        direccion: e.direccion ?? "",
        telefono: e.telefono ?? "",
        email: e.email ?? "",
      });
  }, [e, reset]);
  const save = useApiMutation((v) => api.put("/empresa", v), {
    invalidate: [["empresa", "me"]],
    silent: true,
  });
  const onSubmit = async (v) => {
    setError("");
    try {
      await save.mutateAsync(v);
      toast.success("Datos de empresa actualizados");
    } catch (err) {
      setError(err.userMessage);
    }
  };
  return (
    <Card
      title="Datos de la Empresa"
      icon={Building2}
      actions={
        <Button loading={save.isPending} onClick={handleSubmit(onSubmit)}>
          <Save size={14} className="mr-1" />
          Guardar
        </Button>
      }
    >
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="grid gap-4 sm:grid-cols-3"
      >
        <div className="sm:col-span-3">
          <FormError message={error} />
        </div>
        <Field label="Nombre" className="sm:col-span-2">
          <input className={inputCls} required {...register("nombre")} />
        </Field>
        <Field label="NIT">
          <input className={inputCls} required {...register("nit")} />
        </Field>
        <Field label="Dirección" className="sm:col-span-2">
          <input className={inputCls} {...register("direccion")} />
        </Field>
        <Field label="Teléfono">
          <input className={inputCls} {...register("telefono")} />
        </Field>
        <Field label="Email" className="sm:col-span-3">
          <input type="email" className={inputCls} {...register("email")} />
        </Field>
      </form>
      <div className="mt-4 border-t border-slate-100 pt-4">
        <LogoUploader tieneLogo={!!e?.tiene_logo} />
      </div>
    </Card>
  );
}

function ParametrosCard() {
  const toast = useToast();
  const { data: c } = useEmpresaConfig();
  const [error, setError] = useState("");
  const { register, handleSubmit, reset, watch, setValue } = useForm();
  const h24 = watch("operacion_24h");
  useEffect(() => {
    if (c)
      reset({
        horario_apertura: hhmm(c.horario_apertura),
        horario_cierre: hhmm(c.horario_cierre),
        operacion_24h: !!c.operacion_24h,
        iva_porcentaje: c.iva_porcentaje ?? 0,
        moneda: c.moneda ?? "COP",
        zona_horaria: c.zona_horaria ?? "America/Bogota",
      });
  }, [c, reset]);

  const save = useApiMutation((v) => api.put("/empresa/config", v), {
    invalidate: [["empresa", "config"]],
    silent: true,
  });
  const onSubmit = async (v) => {
    setError("");
    const body = { ...v };
    if (v.operacion_24h) {
      delete body.horario_apertura;
      delete body.horario_cierre;
    } // los inputs deshabilitados no se envían
    try {
      await save.mutateAsync(body);
      toast.success("Configuración actualizada");
    } catch (err) {
      setError(err.userMessage);
    }
  };

  function detectar() {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!tz) return setError("No se pudo detectar la zona del equipo");
    setValue("zona_horaria", tz);
    toast.info(`Zona detectada: ${tz}. Guarda para aplicarla.`);
  }
  const zonaActual = watch("zona_horaria");
  const zonas =
    ZONAS.some(([z]) => z === zonaActual) || !zonaActual
      ? ZONAS
      : [...ZONAS, [zonaActual, `${zonaActual} (personalizada)`]];

  return (
    <Card
      title="Configuración"
      icon={SlidersHorizontal}
      actions={
        <Button loading={save.isPending} onClick={handleSubmit(onSubmit)}>
          <Save size={14} className="mr-1" />
          Guardar
        </Button>
      }
    >
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="grid gap-4 sm:grid-cols-2"
      >
        <div className="sm:col-span-2">
          <FormError message={error} />
        </div>
        <p className="rounded-lg bg-sky-50 px-3 py-2 text-sm text-sky-800 sm:col-span-2">
          Las capacidades de vehículos se configuran en{" "}
          <b>Tipos de Vehículos</b>.
        </p>
        <Field label="Apertura">
          <input
            type="time"
            className={inputCls}
            disabled={h24}
            required={!h24}
            {...register("horario_apertura")}
          />
        </Field>
        <Field label="Cierre">
          <input
            type="time"
            className={inputCls}
            disabled={h24}
            required={!h24}
            {...register("horario_cierre")}
          />
        </Field>
        <label className="flex items-center gap-2 text-sm sm:col-span-2">
          <input
            type="checkbox"
            className="h-4 w-4 accent-brand-600"
            {...register("operacion_24h")}
          />
          Abierto 24 horas
        </label>
        <Field label="IVA (%)">
          <input
            type="number"
            step="0.01"
            min="0"
            max="100"
            className={inputCls}
            required
            {...register("iva_porcentaje")}
          />
        </Field>
        <Field label="Moneda">
          <input
            className={`${inputCls} uppercase`}
            required
            {...register("moneda")}
          />
        </Field>
        <Field
          label="Zona horaria"
          className="sm:col-span-2"
          hint="Elige la zona del país donde opera el parqueadero."
        >
          <div className="flex gap-2">
            <select className={inputCls} required {...register("zona_horaria")}>
              {zonas.map(([z, n]) => (
                <option key={z} value={z}>
                  {n}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={detectar}
              title="Detectar zona del equipo"
              className="rounded-lg border border-slate-300 px-3 text-slate-600 hover:bg-slate-50"
            >
              <LocateFixed size={16} />
            </button>
          </div>
        </Field>
      </form>
    </Card>
  );
}

export default function ConfiguracionPage() {
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <EmpresaCard />
      <ParametrosCard />
    </div>
  );
}
