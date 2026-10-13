// backend/src/routes/auth.routes.js
import { Router } from "express";
import rateLimit from "express-rate-limit";
import { validate } from "../middlewares/validate.js";
import { authenticate } from "../middlewares/authenticate.js";
import { loginSchema } from "../validators/auth.schema.js";
import * as ctrl from "../controllers/auth.controller.js";

const router = Router();

// Límite por IP en memoria, ANTES de tocar la BD (la capa de login_attempts es la segunda defensa)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    code: "TOO_MANY_REQUESTS",
    message: "Demasiadas solicitudes",
  },
});

router.post("/login", loginLimiter, validate(loginSchema), ctrl.login);
router.get("/me", authenticate, ctrl.me);
router.post("/logout", ctrl.logout);

export default router;
