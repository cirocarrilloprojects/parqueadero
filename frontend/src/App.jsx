// frontend/src/App.jsx
import { Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import AppLayout from "./components/layout/AppLayout";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import VehiculosPage from "./pages/VehiculosPage";
import IngresoSalidaPage from "./pages/IngresoSalidaPage";
import MensualidadesPage from "./pages/MensualidadesPage";
import ConfiguracionPage from "./pages/ConfiguracionPage";
import TiposVehiculosPage from "./pages/TiposVehiculosPage";
import TarifasPage from "./pages/TarifasPage";
import UsuariosPage from "./pages/UsuariosPage";
import ReportesPage from "./pages/ReportesPage";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<Navigate to="/admin/dashboard" replace />} />
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/admin/dashboard" element={<DashboardPage />} />
        <Route path="/admin/vehiculos" element={<VehiculosPage />} />
        <Route path="/admin/ingreso-salida" element={<IngresoSalidaPage />} />
        <Route path="/admin/mensualidades" element={<MensualidadesPage />} />
        <Route element={<ProtectedRoute roles={["admin"]} />}>
          <Route path="/admin/configuracion" element={<ConfiguracionPage />} />
          <Route
            path="/admin/tipos-vehiculos"
            element={<TiposVehiculosPage />}
          />
          <Route path="/admin/tarifas" element={<TarifasPage />} />
          <Route path="/admin/usuarios" element={<UsuariosPage />} />
          <Route path="/admin/reportes" element={<ReportesPage />} />
        </Route>
      </Route>
      <Route
        path="/operador/*"
        element={<Navigate to="/admin/dashboard" replace />}
      />
      <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
    </Routes>
  );
}
