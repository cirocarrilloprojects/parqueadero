// frontend/src/components/layout/AppLayout.jsx
import { useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Car,
  ArrowLeftRight,
  CalendarCheck,
  Settings,
  Tags,
  Banknote,
  Users,
  BarChart3,
  LogOut,
  Menu,
  UserCircle,
  DoorClosed,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { TurnoProvider, useTurno } from "../turnos/TurnoProvider";
import Badge from "../ui/Badge";
import ErrorBoundary from "../ui/ErrorBoundary";

const MENU = [
  { to: "/admin/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/admin/vehiculos", icon: Car, label: "Vehículos" },
  {
    to: "/admin/ingreso-salida",
    icon: ArrowLeftRight,
    label: "Ingreso / Salida",
  },
  { to: "/admin/mensualidades", icon: CalendarCheck, label: "Mensualidades" },
  {
    to: "/admin/configuracion",
    icon: Settings,
    label: "Configuración",
    admin: true,
  },
  {
    to: "/admin/tipos-vehiculos",
    icon: Tags,
    label: "Tipos de Vehículos",
    admin: true,
  },
  { to: "/admin/tarifas", icon: Banknote, label: "Tarifas", admin: true },
  { to: "/admin/usuarios", icon: Users, label: "Usuarios", admin: true },
  { to: "/admin/reportes", icon: BarChart3, label: "Reportes", admin: true },
];

function Shell() {
  const { user, logout } = useAuth();
  const { abierto, abrirModal } = useTurno();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const items = MENU.filter((m) => !m.admin || user?.rol === "admin");

  return (
    <div className="min-h-screen bg-slate-50">
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-brand-600 text-white transition-transform lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="p-6 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white text-xl font-semibold text-brand-600">
            PS
          </div>
          <h5 className="mt-3 font-medium">ParkSystem</h5>
        </div>
        <nav className="flex-1 overflow-y-auto py-2">
          {items.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-6 py-3 text-sm transition-colors ${isActive ? "bg-white/10 text-white" : "text-white/80 hover:bg-white/10 hover:text-white"}`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-white/10 p-4">
          <button
            onClick={logout}
            className="flex w-full items-center gap-3 px-2 py-2 text-sm text-white/80 hover:text-white"
          >
            <LogOut size={18} />
            Cerrar Sesión
          </button>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex items-center justify-between bg-white px-4 py-3 shadow-sm">
          <button
            className="rounded p-2 text-brand-600 hover:bg-slate-100 lg:hidden"
            onClick={() => setOpen(true)}
            aria-label="Abrir menú"
          >
            <Menu size={20} />
          </button>
          <div className="ml-auto flex items-center gap-3">
            <Badge tone={abierto ? "green" : "gray"}>
              {abierto ? "Turno abierto" : "Turno cerrado"}
            </Badge>
            <button
              onClick={() => abrirModal(abierto ? "cierre" : "apertura")}
              className="inline-flex items-center gap-1 rounded-lg border border-red-300 px-3 py-1 text-sm text-red-600 hover:bg-red-50"
            >
              <DoorClosed size={14} />
              {abierto ? "Cerrar turno" : "Abrir turno"}
            </button>
            <span className="flex items-center gap-2 text-sm text-slate-600">
              <UserCircle size={20} />
              {user?.nombre ?? "Usuario"}
            </span>
          </div>
        </header>
        <main className="p-4 sm:p-6">
          <ErrorBoundary key={pathname}>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}

export default function AppLayout() {
  return (
    <TurnoProvider>
      <Shell />
    </TurnoProvider>
  );
}
