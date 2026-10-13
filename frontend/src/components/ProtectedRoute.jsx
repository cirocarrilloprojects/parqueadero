// frontend/src/components/ProtectedRoute.jsx
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

// Guard de rutas. Solo experiencia de usuario: la seguridad REAL está en el backend.
// Se usa de dos formas:
//   - Como layout:   <ProtectedRoute><AppLayout /></ProtectedRoute>  → renderiza children
//   - Como wrapper:  <ProtectedRoute roles={["admin"]} />             → renderiza <Outlet />
export default function ProtectedRoute({ roles, children }) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading)
    return (
      <div className="flex min-h-screen items-center justify-center text-slate-500">
        Cargando…
      </div>
    );
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  if (roles && !roles.includes(user.rol))
    return <Navigate to="/admin/dashboard" replace />;
  return children ?? <Outlet />;
}
