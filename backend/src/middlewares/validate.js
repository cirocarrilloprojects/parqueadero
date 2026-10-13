// backend/src/middlewares/validate.js
// Valida body/params/query con esquemas zod y deja el resultado LIMPIO en req.valid.
// Por qué req.valid y no sobrescribir req.query: en Express 5 req.query es de solo lectura.
// zod además "transforma": recorta espacios, convierte a número, descarta campos desconocidos.
export const validate = (schemas) => (req, _res, next) => {
  req.valid = {};
  for (const part of ["params", "query", "body"]) {
    if (schemas[part]) req.valid[part] = schemas[part].parse(req[part]); // si falla lanza ZodError -> errorHandler
  }
  next();
};
