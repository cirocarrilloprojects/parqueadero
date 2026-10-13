// frontend/src/hooks/useEmpresa.js
import { useMemo } from "react";
import { useGet } from "./useApi";
import { formatMoney, formatDateTime } from "../utils/format";

const STALE = 5 * 60_000;
export const useEmpresa = () =>
  useGet(["empresa", "me"], "/empresa/me", { staleTime: STALE });
export const useEmpresaConfig = () =>
  useGet(["empresa", "config"], "/empresa/config", { staleTime: STALE });

// Formateadores ya ligados a la moneda y zona horaria de la empresa.
export function useFormat() {
  const { data: c } = useEmpresaConfig();
  const moneda = c?.moneda ?? "COP";
  const tz = c?.zona_horaria ?? "America/Bogota";
  return useMemo(
    () => ({
      moneda,
      tz,
      fmtMoney: (n) => formatMoney(n, moneda),
      fmtDate: (iso) => (iso ? formatDateTime(iso, tz) : ""),
    }),
    [moneda, tz],
  );
}
