// frontend/src/hooks/useApi.js
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";
import { useToast } from "../components/ui/Toast";

const unwrap = (r) => r.data.data;

export const useGet = (key, url, options) =>
  useQuery({
    queryKey: key,
    queryFn: () => api.get(url).then(unwrap),
    ...options,
  });

// silent: el formulario muestra el error en línea, sin toast.
export function useApiMutation(
  fn,
  { invalidate = [], onSuccess, silent = false } = {},
) {
  const qc = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (v) => fn(v).then(unwrap),
    onSuccess: (data, vars) => {
      invalidate.forEach((queryKey) => qc.invalidateQueries({ queryKey }));
      onSuccess?.(data, vars);
    },
    onError: (e) => !silent && toast.error(e.userMessage || "Ocurrió un error"),
  });
}
