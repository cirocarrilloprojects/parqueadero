// frontend/src/api/client.js
import axios from "axios";

// Cliente HTTP único. withCredentials hace que el navegador envíe/reciba la cookie de sesión.
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "/api",
  withCredentials: true,
});

// Normaliza errores: el resto de la app solo lee `error.userMessage`.
api.interceptors.response.use(
  (res) => res,
  (error) => {
    error.userMessage =
      error.response?.data?.message ?? "No se pudo conectar con el servidor";
    error.code = error.response?.data?.code;
    return Promise.reject(error);
  },
);

export default api;
