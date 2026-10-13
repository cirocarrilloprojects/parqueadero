// frontend/src/context/AuthContext.jsx
import { createContext, useContext } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const qc = useQueryClient();

  const { data: user, isLoading } = useQuery({
    queryKey: ["me"],
    queryFn: () => api.get("/auth/me").then((r) => r.data.data),
    staleTime: Infinity,
    retry: false,
  });

  const login = async (credentials) => {
    const { data } = await api.post("/auth/login", credentials);
    qc.setQueryData(["me"], data.data);
  };

  const logout = async () => {
    await api.post("/auth/logout");
    // Notifica de forma determinista que la sesión terminó.
    // setQueryData es más predecible que qc.clear(): escribe null y notifica
    // a todos los suscriptores de ["me"] al instante.
    qc.setQueryData(["me"], null);
    // Limpia el resto del caché de la sesión anterior.
    qc.removeQueries({ queryKey: ["turno"] });
    qc.removeQueries({ queryKey: ["empresa"] });
    qc.removeQueries({ queryKey: ["dashboard"] });
    qc.removeQueries({ queryKey: ["vehiculos"] });
    qc.removeQueries({ queryKey: ["usuarios"] });
    qc.removeQueries({ queryKey: ["tipos"] });
    qc.removeQueries({ queryKey: ["tarifas"] });
    qc.removeQueries({ queryKey: ["mensualidades"] });
    qc.removeQueries({ queryKey: ["reportes"] });
    qc.removeQueries({ queryKey: ["ticket"] });
  };

  return (
    <AuthContext.Provider
      value={{ user: user ?? null, isLoading, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  return ctx;
};
