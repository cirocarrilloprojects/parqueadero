// frontend/src/hooks/useMovimientos.js
import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "../api/client.js";

// Custom hooks = la capa de "servicios API" del frontend: los componentes no conocen URLs ni axios.

export const useTiposActivos = () =>
  useQuery({
    queryKey: ["tipos-activos"],
    queryFn: () => api.get("/tipos-vehiculos/activos").then((r) => r.data.data),
    staleTime: 5 * 60 * 1000, // los tipos cambian poco: 5 min de caché
  });

export const useRegistrarIngreso = () =>
  useMutation({
    mutationFn: (body) =>
      api.post("/movimientos/ingreso", body).then((r) => r.data.data),
  });

export const useCalcularSalida = () =>
  useMutation({
    mutationFn: (placa) =>
      api
        .post("/movimientos/calcular-salida", { placa })
        .then((r) => r.data.data),
  });

export const useConfirmarSalida = () =>
  useMutation({
    mutationFn: (body) =>
      api.post("/movimientos/confirmar-salida", body).then((r) => r.data.data),
  });
