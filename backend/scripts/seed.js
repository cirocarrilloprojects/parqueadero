// Crea la empresa demo, tipos, tarifas y un admin. Uso: npm run db:seed
// Idempotente: se puede correr varias veces sin duplicar datos.
import bcrypt from "bcryptjs";
import { pool } from "../src/config/db.js";

const ADMIN_PASSWORD = process.argv[2] ?? "nueva123456";
const NIT = "900123456-7";

// 1. Empresa: insertar o actualizar
await pool.query(
  `INSERT INTO empresas (nombre, nit, direccion, plan)
   VALUES (?,?,?,'premium')
   ON DUPLICATE KEY UPDATE nombre = VALUES(nombre), direccion = VALUES(direccion)`,
  ["Parqueadero Central", NIT, "Calle Principal #123"],
);

// 2. Obtener el id_empresa (exista o se haya creado)
const [[emp]] = await pool.query(
  `SELECT id_empresa FROM empresas WHERE nit = ?`,
  [NIT],
);
const idEmpresa = emp.id_empresa;

// 3. Configuración empresa: insertar solo si no existe
await pool.query(
  `INSERT IGNORE INTO configuracion_empresa (id_empresa) VALUES (?)`,
  [idEmpresa],
);

// 4. Tipos de vehículos: insertar o actualizar por (id_empresa, codigo)
await pool.query(
  `INSERT INTO tipos_vehiculos (id_empresa, nombre, codigo, capacidad)
   VALUES (?,?,?,?),(?,?,?,?),(?,?,?,?)
   ON DUPLICATE KEY UPDATE nombre = VALUES(nombre), capacidad = VALUES(capacidad)`,
  [
    idEmpresa,
    "Carro",
    "carro",
    100,
    idEmpresa,
    "Moto",
    "moto",
    50,
    idEmpresa,
    "Bicicleta",
    "bici",
    30,
  ],
);

// 5. Tarifas: insertar o actualizar por (id_empresa, id_tipo)
await pool.query(
  `INSERT INTO tarifas (id_empresa, id_tipo, valor_minuto, valor_hora, valor_dia_completo)
   SELECT ?, id_tipo,
     CASE codigo WHEN 'carro' THEN 120 WHEN 'moto' THEN 60 ELSE 30 END,
     CASE codigo WHEN 'carro' THEN 6000 WHEN 'moto' THEN 3000 ELSE 1500 END,
     CASE codigo WHEN 'carro' THEN 30000 WHEN 'moto' THEN 15000 ELSE 8000 END
   FROM tipos_vehiculos WHERE id_empresa = ?
   ON DUPLICATE KEY UPDATE
     valor_minuto = VALUES(valor_minuto),
     valor_hora = VALUES(valor_hora),
     valor_dia_completo = VALUES(valor_dia_completo)`,
  [idEmpresa, idEmpresa],
);

// 6. Admin: insertar o actualizar password
const hash = await bcrypt.hash(ADMIN_PASSWORD, 12);
await pool.query(
  `INSERT INTO usuarios (id_empresa, nombre, usuario_login, password_hash, rol)
   VALUES (?,?,?,?,'admin')
   ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash), nombre = VALUES(nombre)`,
  [idEmpresa, "Administrador", "admin", hash],
);

console.log(
  "Seed OK. NIT:",
  NIT,
  "| usuario: admin | password:",
  ADMIN_PASSWORD,
);
await pool.end();
