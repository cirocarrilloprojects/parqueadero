// frontend/src/components/ui/Toast.jsx
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

const Ctx = createContext(null);
export const useToast = () => useContext(Ctx);
const tone = {
  success: "bg-emerald-600",
  error: "bg-red-600",
  info: "bg-sky-600",
  warning: "bg-amber-500",
};

export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);
  const push = useCallback((type, msg) => {
    const id = crypto.randomUUID();
    setItems((s) => [...s, { id, type, msg }]);
    setTimeout(() => setItems((s) => s.filter((i) => i.id !== id)), 3500);
  }, []);
  const api = useMemo(
    () => ({
      success: (m) => push("success", m),
      error: (m) => push("error", m),
      info: (m) => push("info", m),
      warning: (m) => push("warning", m),
    }),
    [push],
  );
  return (
    <Ctx.Provider value={api}>
      {children}
      <div
        className="fixed right-4 top-4 z-100 flex flex-col gap-2"
        role="status"
        aria-live="polite"
      >
        {items.map((i) => (
          <div
            key={i.id}
            className={`${tone[i.type]} max-w-sm rounded-lg px-4 py-3 text-sm text-white shadow-lg`}
          >
            {i.msg}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}
