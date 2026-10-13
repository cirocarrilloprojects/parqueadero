// backend/src/utils/mapDb.js
import { AppError } from "./AppError.js";

// Traduce errores de MySQL a errores de negocio con mensaje claro.
export async function mapDb(fn, { dup, fk } = {}) {
  try {
    return await fn();
  } catch (e) {
    if (dup && e.code === "ER_DUP_ENTRY")
      throw new AppError(dup, 409, "DUPLICATE");
    if (
      fk &&
      (e.code === "ER_ROW_IS_REFERENCED_2" || e.code === "ER_ROW_IS_REFERENCED")
    )
      throw new AppError(fk, 409, "IN_USE");
    throw e;
  }
}
