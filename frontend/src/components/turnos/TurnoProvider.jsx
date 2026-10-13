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

  // Estado del horario del negocio, independiente del turno.
  // Refresca cada 60 s para que el banner cambie solo cuando se acerca
  // la hora de cierre, sin recargar la página.
  const { data: horario } = useGet(
    ["turno", "estado-horario"],
    "/turnos/estado-horario",
    { refetchInterval: 60_000, staleTime: 30_000 },
  );

  const [modal, setModal] = useState(null);
  const preguntado = useRef(false);

  useEffect(() => {
    if (isSuccess && !turno && !preguntado.current) {
      preguntado.current = true;
      setModal("apertura");
    }
  }, [isSuccess, turno]);

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
      // Estado del horario. `bloqueado` ya viene calculado por el backend.
      // El frontend solo lo usa para deshabilitar el botón de ingreso.
      horario: horario ?? null,
      bloqueado: horario?.bloqueado ?? false,
    }),
    [turno, requireTurno, horario],
  );

  return (
    <Ctx.Provider value={value}>
      {children}
      {modal && <TurnoModal modo={modal} onClose={() => setModal(null)} />}
    </Ctx.Provider>
  );
}
