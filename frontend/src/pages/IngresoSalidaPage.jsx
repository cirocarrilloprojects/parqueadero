// frontend/src/pages/IngresoSalidaPage.jsx
import { useState } from "react";
import { LogIn, LogOut } from "lucide-react";
import Card from "../components/ui/Card";
import IngresoForm from "../components/movimientos/IngresoForm";
import SalidaPanel from "../components/movimientos/SalidaPanel";
import ComprobantePanel from "../components/tickets/ComprobantePanel";

export default function IngresoSalidaPage() {
  const [ingreso, setIngreso] = useState(null); // id del movimiento
  const [salida, setSalida] = useState(null);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card title="Ingreso rápido" icon={LogIn}>
        <IngresoForm onDone={setIngreso} />
        {ingreso && (
          <ComprobantePanel
            key={ingreso}
            id={ingreso}
            tipo="INGRESO"
            onClose={() => setIngreso(null)}
          />
        )}
      </Card>
      <Card title="Salida y cobro" icon={LogOut}>
        <SalidaPanel onDone={setSalida} />
        {salida && (
          <ComprobantePanel
            key={salida}
            id={salida}
            tipo="SALIDA"
            autoPrint
            onClose={() => setSalida(null)}
          />
        )}
      </Card>
    </div>
  );
}
