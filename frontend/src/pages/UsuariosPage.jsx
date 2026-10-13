// frontend/src/pages/UsuariosPage.jsx
import { useState } from "react";
import { useForm } from "react-hook-form";
import { UserPlus, Pencil, KeyRound, UserX, Eye, EyeOff } from "lucide-react";
import { api } from "../api/client";
import { useGet, useApiMutation } from "../hooks/useApi";
import { useFormat } from "../hooks/useEmpresa";
import { useAuth } from "../context/AuthContext";
import { useAdminPassword } from "../components/ui/AdminPasswordContext";
import Card from "../components/ui/Card";
import DataTable from "../components/ui/DataTable";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import Modal from "../components/ui/Modal";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import { Field, FormError, inputCls } from "../components/ui/Field";
import { useToast } from "../components/ui/Toast";

// Wrapper: ejecuta; si el backend responde PASSWORD_REQUIRED, pide la
// contraseña al admin (fuera de cualquier otro modal) y reintenta una vez.
async function conPassword(pedir, run) {
  try {
    return await run();
  } catch (e) {
    if (e.code !== "PASSWORD_REQUIRED") throw e;
    const pwd = await pedir(
      "Vas a realizar una acción sensible. Confirma tu identidad.",
    );
    if (!pwd) throw new Error("CANCELADO");
    return await run(pwd);
  }
}

function UsuarioModal({ usuario, onClose }) {
  const toast = useToast();
  const { pedir } = useAdminPassword();
  const editando = !!usuario.id_usuario;
  const [error, setError] = useState("");

  const { register, handleSubmit } = useForm({
    defaultValues: {
      nombre: usuario.nombre ?? "",
      usuario_login: usuario.usuario_login ?? "",
      password: "",
      rol: usuario.rol ?? "operador",
      activo: usuario.activo === undefined ? true : !!usuario.activo,
    },
  });

  const save = useApiMutation(
    ({ body, admin_password }) =>
      editando
        ? api.put(`/usuarios/${usuario.id_usuario}`, {
            ...body,
            ...(admin_password ? { admin_password } : {}),
          })
        : api.post("/usuarios", body),
    { invalidate: [["usuarios"]], silent: true },
  );

  const onSubmit = async (v) => {
    setError("");
    const body = { ...v };
    // En edición, nunca mandamos contraseña por aquí. La contraseña se cambia
    // SOLO por el modal dedicado "Restablecer contraseña".
    if (editando) delete body.password;
    try {
      await conPassword(pedir, (pwd) =>
        save.mutateAsync({ body, admin_password: pwd }),
      );
      toast.success(editando ? "Usuario actualizado" : "Usuario creado");
      onClose();
    } catch (e) {
      if (e.message === "CANCELADO") return;
      setError(e.userMessage ?? e.message);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={editando ? "Editar Usuario" : "Nuevo Usuario"}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="usr-form" loading={save.isPending}>
            Guardar
          </Button>
        </>
      }
    >
      <form
        id="usr-form"
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-4"
        autoComplete="off"
      >
        <FormError message={error} />
        <Field label="Nombre">
          <input className={inputCls} required {...register("nombre")} />
        </Field>
        <Field
          label="Usuario"
          hint="Solo letras y números, sin espacios ni guiones"
        >
          <input
            className={inputCls}
            required
            pattern="[A-Za-z0-9]+"
            minLength={3}
            {...register("usuario_login")}
          />
        </Field>

        {/* Campo de contraseña SOLO al crear. En edición se oculta: la
            contraseña se cambia por el modal dedicado del ícono llave. */}
        {!editando && (
          <Field label="Contraseña" hint="Mínimo 6 caracteres">
            <input
              type="password"
              className={inputCls}
              required
              minLength={6}
              autoComplete="new-password"
              {...register("password")}
            />
          </Field>
        )}

        {editando && (
          <p className="rounded bg-sky-50 px-3 py-2 text-xs text-sky-800">
            Para cambiar la contraseña usa el botón{" "}
            <b>Restablecer contraseña</b> (ícono de llave).
          </p>
        )}

        <Field label="Rol">
          <select className={inputCls} {...register("rol")}>
            <option value="admin">Administrador</option>
            <option value="operador">Operador</option>
          </select>
        </Field>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="h-4 w-4 accent-brand-600"
            {...register("activo")}
          />
          Activo
        </label>
      </form>
    </Modal>
  );
}

function PasswordModal({ usuario, onClose }) {
  const toast = useToast();
  const { pedir } = useAdminPassword();
  const [pwd, setPwd] = useState("");
  const [conf, setConf] = useState("");
  const [ver, setVer] = useState(false);
  const [error, setError] = useState("");

  const save = useApiMutation(
    ({ password, admin_password }) =>
      api.put(`/usuarios/${usuario.id_usuario}`, { password, admin_password }),
    { silent: true },
  );

  async function submit(e) {
    e.preventDefault();
    if (pwd.length < 6)
      return setError("La contraseña debe tener al menos 6 caracteres.");
    if (pwd !== conf) return setError("Las contraseñas no coinciden.");
    try {
      await conPassword(pedir, (adminPwd) =>
        save.mutateAsync({ password: pwd, admin_password: adminPwd }),
      );
      toast.success("Contraseña actualizada correctamente");
      onClose();
    } catch (err) {
      if (err.message === "CANCELADO") return;
      setError(err.userMessage ?? err.message);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Restablecer contraseña"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="pwd-form" loading={save.isPending}>
            Guardar
          </Button>
        </>
      }
    >
      <form id="pwd-form" onSubmit={submit} className="space-y-4">
        <FormError message={error} />
        <Field label="Usuario">
          <input
            disabled
            className={inputCls}
            value={`${usuario.usuario_login} (${usuario.nombre})`}
            readOnly
          />
        </Field>
        <Field label="Nueva contraseña" hint="Mínimo 6 caracteres">
          <div className="relative">
            <input
              type={ver ? "text" : "password"}
              className={inputCls}
              value={pwd}
              onChange={(e) => setPwd(e.target.value)}
              autoComplete="new-password"
              required
            />
            <button
              type="button"
              onClick={() => setVer(!ver)}
              aria-label="Mostrar u ocultar"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500"
            >
              {ver ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </Field>
        <Field label="Confirmar contraseña">
          <input
            type="password"
            className={inputCls}
            value={conf}
            onChange={(e) => setConf(e.target.value)}
            autoComplete="new-password"
            required
          />
        </Field>
        <p className="text-xs text-slate-500">
          El usuario tendrá que usar esta nueva contraseña en su próximo
          ingreso.
        </p>
      </form>
    </Modal>
  );
}

export default function UsuariosPage() {
  const toast = useToast();
  const { user: yo } = useAuth();
  const { fmtDate } = useFormat();
  const { pedir } = useAdminPassword();
  const { data = [], isLoading } = useGet(["usuarios"], "/usuarios");
  const [editing, setEditing] = useState(null);
  const [pwdFor, setPwdFor] = useState(null);
  const [toDeactivate, setToDeactivate] = useState(null);

  const deactivate = useApiMutation(
    ({ id, admin_password }) =>
      api.delete(`/usuarios/${id}`, { data: { admin_password } }),
    { invalidate: [["usuarios"]], silent: true },
  );

  async function onConfirmDeactivate() {
    try {
      await conPassword(pedir, (adminPwd) =>
        deactivate.mutateAsync({
          id: toDeactivate.id_usuario,
          admin_password: adminPwd,
        }),
      );
      toast.success("Usuario desactivado");
      setToDeactivate(null);
    } catch (e) {
      if (e.message === "CANCELADO") return;
      toast.error(e.userMessage ?? "No se pudo desactivar");
    }
  }

  const columns = [
    { key: "nombre", header: "Nombre" },
    { key: "usuario_login", header: "Usuario" },
    {
      key: "rol",
      header: "Rol",
      render: (u) => (
        <Badge tone={u.rol === "admin" ? "blue" : "gray"}>
          {u.rol.toUpperCase()}
        </Badge>
      ),
    },
    {
      key: "activo",
      header: "Activo",
      render: (u) => (
        <Badge tone={u.activo ? "green" : "gray"}>
          {u.activo ? "Sí" : "No"}
        </Badge>
      ),
    },
    {
      key: "ultimo_acceso",
      header: "Último acceso",
      render: (u) => (u.ultimo_acceso ? fmtDate(u.ultimo_acceso) : "-"),
    },
    {
      key: "acciones",
      header: "Acciones",
      sortable: false,
      searchable: false,
      render: (u) => (
        <div className="flex gap-1">
          <button
            title="Editar"
            onClick={() => setEditing(u)}
            className="rounded bg-sky-500 p-1.5 text-white hover:bg-sky-600"
          >
            <Pencil size={14} />
          </button>
          <button
            title="Restablecer contraseña"
            onClick={() => setPwdFor(u)}
            className="rounded bg-amber-500 p-1.5 text-white hover:bg-amber-600"
          >
            <KeyRound size={14} />
          </button>
          <button
            title="Desactivar"
            disabled={u.id_usuario === yo?.id || !u.activo}
            onClick={() => setToDeactivate(u)}
            className="rounded bg-red-500 p-1.5 text-white hover:bg-red-600 disabled:opacity-40"
          >
            <UserX size={14} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <>
      <Card
        title="Gestión de Usuarios"
        actions={
          <Button onClick={() => setEditing({})}>
            <UserPlus size={16} className="mr-1" />
            Nuevo Usuario
          </Button>
        }
      >
        <DataTable columns={columns} rows={data} loading={isLoading} />
      </Card>
      {editing && (
        <UsuarioModal usuario={editing} onClose={() => setEditing(null)} />
      )}
      {pwdFor && (
        <PasswordModal usuario={pwdFor} onClose={() => setPwdFor(null)} />
      )}
      <ConfirmDialog
        open={!!toDeactivate}
        title="Desactivar usuario"
        confirmText="Desactivar"
        loading={deactivate.isPending}
        message={`¿Desactivar a ${toDeactivate?.nombre}?\n\nEl usuario quedará inactivo y ya no podrá iniciar sesión. Su historial se conserva.`}
        onConfirm={onConfirmDeactivate}
        onClose={() => setToDeactivate(null)}
      />
    </>
  );
}
