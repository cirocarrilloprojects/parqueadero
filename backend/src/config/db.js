// backend/src/config/db.js
import mysql from "mysql2/promise";
import { env } from "./env.js";

// Un POOL reutiliza conexiones abiertas (abrir una por petición sería lentísimo).
export const pool = mysql.createPool({
  host: env.DB_HOST,
  port: env.DB_PORT,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  multipleStatements: false, // un solo statement por query: frena inyecciones encadenadas ("; DROP ...")
  timezone: "Z", // DATETIME <-> Date de JS siempre en UTC (ver schema.sql)
  decimalNumbers: true, // DECIMAL llega como number (no string). Los cálculos de dinero
  // los hacemos en centavos enteros para evitar errores de coma flotante.
});

// Cada conexión nueva del pool queda con zona horaria UTC, así NOW()/UTC_TIMESTAMP() coinciden.
pool.on("connection", (conn) => conn.query("SET time_zone = '+00:00'"));

/**
 * Ejecuta `fn` dentro de una transacción.
 * - Si `fn` termina bien -> COMMIT. Si lanza un error -> ROLLBACK y se relanza.
 * - `fn` recibe la conexión: TODAS las consultas de la transacción deben usarla.
 */
export async function withTransaction(fn) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const result = await fn(conn);
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release(); // SIEMPRE devolver la conexión al pool, o el pool se agota
  }
}
