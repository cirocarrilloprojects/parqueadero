// frontend/src/components/ui/AdminPasswordContext.jsx
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import { ShieldCheck, Eye, EyeOff } from "lucide-react";
import Modal from "./Modal";
import Button from "./Button";
import { Field, inputCls } from "./Field";

const Ctx = createContext(null);

export const useAdminPassword = () => {
  const ctx = useContext(Ctx);
  if (!ctx)
    throw new Error(
      "useAdminPassword debe usarse dentro de <AdminPasswordProvider>",
    );
  return ctx;
};

export function AdminPasswordProvider({ children }) {
  const [pedido, setPedido] = useState(null);
  const [pwd, setPwd] = useState("");
  const [ver, setVer] = useState(false);
  const resolverRef = useRef(null);

  const pedir = useCallback((mensaje) => {
    return new Promise((resolve) => {
      resolverRef.current = resolve;
      setPwd("");
      setVer(false);
      setPedido({ mensaje });
    });
  }, []);

  const cerrar = (valor) => {
    resolverRef.current?.(valor);
    resolverRef.current = null;
    setPedido(null);
    setPwd("");
  };

  const value = useMemo(() => ({ pedir }), [pedir]);

  return (
    <Ctx.Provider value={value}>
      {children}
      <Modal
        open={!!pedido}
        onClose={() => cerrar(null)}
        title="Confirmar tu contraseña"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => cerrar(null)}>
              Cancelar
            </Button>
            <Button onClick={() => cerrar(pwd)} disabled={!pwd}>
              <ShieldCheck size={14} className="mr-1" />
              Confirmar
            </Button>
          </>
        }
      >
        {pedido && (
          <>
            <p className="mb-3 text-sm text-slate-600">{pedido.mensaje}</p>
            <Field label="Tu contraseña (admin)">
              <div className="relative">
                <input
                  type={ver ? "text" : "password"}
                  className={inputCls}
                  value={pwd}
                  onChange={(e) => setPwd(e.target.value)}
                  autoComplete="current-password"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setVer((v) => !v)}
                  aria-label="Mostrar u ocultar"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500"
                >
                  {ver ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </Field>
            <p className="mt-2 text-xs text-slate-500">
              Solo se pedirá una vez cada 15 minutos.
            </p>
          </>
        )}
      </Modal>
    </Ctx.Provider>
  );
}
