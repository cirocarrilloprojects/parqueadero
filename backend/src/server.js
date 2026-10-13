// backend/src/server.js
import { app } from "./app.js";
import { env } from "./config/env.js";
import { pool } from "./config/db.js";

const server = app.listen(env.PORT, () =>
  console.log(`API escuchando en http://localhost:${env.PORT}`),
);

// Cierre ordenado: deja terminar las peticiones en curso y cierra el pool de MySQL
const shutdown = () =>
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
