// backend/src/app.js
import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { env } from "./config/env.js";
import routes from "./routes/index.js";
import { sameOrigin } from "./middlewares/sameOrigin.js";
import { errorHandler } from "./middlewares/errorHandler.js";
import { AppError } from "./utils/AppError.js";

const app = express();
const https = String(env.COOKIE_SECURE) === "true";

app.set("trust proxy", env.TRUST_PROXY); // número de proxies delante (0 = ninguno)
app.disable("x-powered-by");
app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      // Sin HTTPS no se debe forzar la mejora a https: deja la app en blanco.
      directives: { "upgrade-insecure-requests": https ? [] : null },
    },
    hsts: https, // HSTS solo tiene sentido con HTTPS
  }),
);
app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
app.use(morgan(env.NODE_ENV === "production" ? "combined" : "dev"));
app.use(express.json({ limit: "100kb" }));
app.use(cookieParser());

app.use(
  "/api",
  rateLimit({
    windowMs: 60_000,
    limit: 300,
    standardHeaders: true,
    legacyHeaders: false,
  }),
  sameOrigin,
  routes,
  (req, res, next) =>
    next(new AppError("Ruta no encontrada", 404, "NOT_FOUND")),
);

if (env.NODE_ENV === "production") {
  const dist = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "../../frontend/dist",
  );
  app.use(
    express.static(dist, {
      index: false,
      setHeaders: (res, p) =>
        p.includes(`${path.sep}assets${path.sep}`) &&
        res.setHeader("Cache-Control", "public, max-age=31536000, immutable"),
    }),
  );
  // Express 5 ya no acepta "*": se usa una regex que excluye /api para el fallback de la SPA.
  app.get(/^\/(?!api\/).*/, (req, res) =>
    res
      .set("Cache-Control", "no-cache")
      .sendFile(path.join(dist, "index.html")),
  );
}

app.use(errorHandler);
export { app };
export default app;
