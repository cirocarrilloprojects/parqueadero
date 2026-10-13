// frontend/src/pages/LoginPage.jsx
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import Button from "../components/ui/Button.jsx";

const schema = z.object({
  nit: z.string().trim().min(3, "Ingresa el NIT de la empresa"),
  usuario: z.string().trim().min(3, "Mínimo 3 caracteres"),
  password: z.string().min(6, "Mínimo 6 caracteres"),
});

export default function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [serverError, setServerError] = useState("");
  const [showPwd, setShowPwd] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(schema) });

  if (user) return <Navigate to="/admin/dashboard" replace />;

  const onSubmit = async (values) => {
    setServerError("");
    try {
      await login(values);
      navigate(location.state?.from?.pathname ?? "/admin/dashboard", {
        replace: true,
      });
    } catch (e) {
      setServerError(e.userMessage);
    }
  };

  const field =
    "mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/20";

  return (
    <main className="flex min-h-screen items-center justify-center bg-linear-to-br from-slate-100 to-slate-200 p-4">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="w-full max-w-md space-y-4 rounded-2xl bg-white p-8 shadow-lg"
        noValidate
      >
        <div className="text-center">
          <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-brand-600 text-2xl font-semibold text-white">
            PS
          </div>
          <h1 className="mt-3 text-2xl font-bold text-brand-600">
            {import.meta.env.VITE_APP_NAME}
          </h1>
          <p className="text-sm text-gray-500">
            Sistema de Gestión de Parqueadero
          </p>
        </div>

        {serverError && (
          <div
            role="alert"
            className="rounded-lg bg-red-50 p-3 text-sm text-red-700"
          >
            {serverError}
          </div>
        )}

        <label className="block text-sm font-medium">
          NIT de la empresa
          <input
            className={field}
            placeholder="Ej: 900123456-7"
            {...register("nit")}
          />
          {errors.nit && (
            <span className="text-xs text-red-600">{errors.nit.message}</span>
          )}
        </label>
        <label className="block text-sm font-medium">
          Usuario
          <input
            className={field}
            autoComplete="username"
            {...register("usuario")}
          />
          {errors.usuario && (
            <span className="text-xs text-red-600">
              {errors.usuario.message}
            </span>
          )}
        </label>
        <label className="block text-sm font-medium">
          Contraseña
          <div className="relative">
            <input
              className={field}
              type={showPwd ? "text" : "password"}
              autoComplete="current-password"
              {...register("password")}
            />
            <button
              type="button"
              onClick={() => setShowPwd((v) => !v)}
              className="absolute right-3 top-3 text-xs text-gray-500"
            >
              {showPwd ? "Ocultar" : "Ver"}
            </button>
          </div>
          {errors.password && (
            <span className="text-xs text-red-600">
              {errors.password.message}
            </span>
          )}
        </label>

        <Button type="submit" loading={isSubmitting} className="w-full">
          Iniciar sesión
        </Button>
        <p className="text-center text-xs text-gray-500">
          ¿Olvidaste tu contraseña? Contacta al administrador
        </p>
      </form>
    </main>
  );
}
