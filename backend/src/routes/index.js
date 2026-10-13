// backend/src/routes/index.js
import { Router } from "express";
import auth from "./auth.routes.js";
import movimientos from "./movimientos.routes.js";
import tipos from "./tiposVehiculos.routes.js";
import tiposRoutes from "./tiposVehiculos.routes.js";
import vehiculosRoutes from "./vehiculos.routes.js";
import tarifasRoutes from "./tarifas.routes.js";
import usuariosRoutes from "./usuarios.routes.js";
import empresaRoutes from "./empresa.routes.js";
import turnosRoutes from "./turnos.routes.js";
import dashboardRoutes from "./dashboard.routes.js";
import ticketRoutes from "./ticket.routes.js";
import mensualidadesRoutes from "./mensualidades.routes.js";
import reportesRoutes from "./reportes.routes.js";

// Agregador: aquí se montan los módulos. Las fases siguientes añaden una línea por módulo.
const router = Router();
router.use("/auth", auth);
router.use("/movimientos", movimientos);
router.use("/tipos-vehiculos", tipos);
router.use("/tipos-vehiculos", tiposRoutes);
router.use("/vehiculos", vehiculosRoutes);
router.use("/tarifas", tarifasRoutes);
router.use("/usuarios", usuariosRoutes);
router.use("/empresa", empresaRoutes);
router.use("/turnos", turnosRoutes);
router.use("/dashboard", dashboardRoutes);
router.use("/movimientos", ticketRoutes);
router.use("/mensualidades", mensualidadesRoutes);
router.use("/reportes", reportesRoutes);
export default router;
