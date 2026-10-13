// frontend/src/components/turnos/TurnoProvider.jsx
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useGet } from "../../hooks/useApi";
import TurnoModal from "./TurnoModal";

const Ctx = createContext(null);
export const useTurno = () => useContext(Ctx);

export function TurnoProvider({ children }) {
  const { data: turno, isSuccess } = useGet(
    ["turno", "actual"],
    "/turnos/actual",
  );
  const [modal, setModal] = useState(null); // "apertura" | "cierre" | null
  const preguntado = useRef(false);

  // Igual que el original: al entrar sin turno abierto se ofrece abrirlo.
  useEffect(() => {
    if (isSuccess && !turno && !preguntado.current) {
      preguntado.current = true;
      setModal("apertura");
    }
  }, [isSuccess, turno]);

  // Las acciones críticas (ingreso, salida, pago de mensualidad) llaman a esto antes de enviar.
  // El servidor también lo exige: este chequeo solo evita el viaje de ida y vuelta.
  const requireTurno = useCallback(() => {
    if (turno) return true;
    setModal("apertura");
    return false;
  }, [turno]);

  const value = useMemo(
    () => ({
      turno: turno ?? null,
      abierto: !!turno,
      requireTurno,
      abrirModal: setModal,
    }),
    [turno, requireTurno],
  );
  return (
    <Ctx.Provider value={value}>
      {children}
      {modal && <TurnoModal modo={modal} onClose={() => setModal(null)} />}
    </Ctx.Provider>
  );
}
