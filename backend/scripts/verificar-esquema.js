// backend/scripts/verificar-esquema.js
import "dotenv/config";
import mysql from "mysql2/promise";

const ESPERADO = {
  empresas:
    "id_empresa nombre nit direccion telefono email activa plan fecha_registro fecha_vencimiento",
  empresa_logos: "id_empresa mime datos",
  configuracion_empresa:
    "id_empresa horario_apertura horario_cierre iva_porcentaje moneda zona_horaria operacion_24h",
  usuarios:
    "id_usuario id_empresa nombre usuario_login password_hash rol activo ultimo_acceso fecha_creacion",
  tipos_vehiculos:
    "id_tipo id_empresa nombre codigo capacidad activo fecha_creacion",
  vehiculos: "id_vehiculo id_empresa placa id_tipo color modelo fecha_registro",
  tarifas:
    "id_tarifa id_empresa id_tipo valor_hora valor_minuto valor_dia_completo fecha_vigencia_desde fecha_vigencia_hasta activa modo_cobro paso_minutos_a_horas paso_horas_a_dias redondeo_horas redondeo_dias",
  movimientos:
    "id_movimiento id_empresa id_vehiculo id_tarifa fecha_entrada fecha_salida total_a_pagar id_usuario_entrada id_usuario_salida estado",
  pagos:
    "id_pago id_empresa id_movimiento id_turno metodo_pago monto monto_recibido fecha_pago referencia_pago id_usuario",
  turnos:
    "id_turno id_empresa id_usuario fecha_apertura base_inicial observacion_apertura fecha_cierre total_efectivo total_tarjeta total_qr total_general diferencia observacion_cierre estado",
  mensualidades:
    "id_mensualidad id_empresa id_vehiculo titular_nombre titular_documento titular_telefono titular_email valor_mensual fecha_inicio fecha_fin auto_renovar estado observaciones fecha_creacion",
  mensualidades_pagos:
    "id_pago_mensualidad id_empresa id_mensualidad id_turno fecha_pago periodo_desde periodo_hasta metodo_pago monto referencia_pago id_usuario",
  login_attempts: "id_empresa usuario_login exitoso ip_address fecha_intento",
};
// Índices únicos que sostienen la integridad (columnas generadas de la fase 1)
const UNICOS = {
  movimientos: "vehiculo_activo",
  turnos: "usuario_abierto",
  tarifas: "tipo_activo",
};

const db = await mysql.createConnection({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});
const bd = process.env.DB_NAME;
let fallos = 0;
const ok = (m) => console.log(`  ✔ ${m}`);
const mal = (m) => (fallos++, console.log(`  ✘ ${m}`));

const [[{ v }]] = await db.query("SELECT VERSION() AS v");
console.log(`Servidor: ${v}`);
const [mayor, menor, parche] = v.split("-")[0].split(".").map(Number);
/mariadb/i.test(v)
  ? mal(
      "MariaDB no está soportada (se usa INSERT … AS alias): usa MySQL 8.0.19 o superior",
    )
  : mayor > 8 || (mayor === 8 && (menor > 0 || parche >= 19))
    ? ok("Versión de MySQL compatible")
    : mal("Se requiere MySQL 8.0.19 o superior");

const [cols] = await db.query(
  "SELECT TABLE_NAME AS t, COLUMN_NAME AS c, COLUMN_TYPE AS ct FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ?",
  [bd],
);
const porTabla = new Map();
for (const { t, c, ct } of cols)
  (porTabla.get(t) ?? porTabla.set(t, new Map()).get(t)).set(c, ct);

console.log("\nColumnas");
for (const [tabla, lista] of Object.entries(ESPERADO)) {
  const reales = porTabla.get(tabla);
  if (!reales) {
    mal(`falta la tabla ${tabla}`);
    continue;
  }
  const faltan = lista.split(" ").filter((c) => !reales.has(c));
  faltan.length ? mal(`${tabla}: faltan ${faltan.join(", ")}`) : ok(tabla);
}
if (porTabla.get("usuarios")?.has("contraseña"))
  mal("usuarios.contraseña existe: esta parece la base VIEJA, no la nueva");

console.log("\nÍndices únicos de integridad");
const [idx] = await db.query(
  "SELECT TABLE_NAME AS t, INDEX_NAME AS i, COLUMN_NAME AS c FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = ? AND NON_UNIQUE = 0",
  [bd],
);
for (const [tabla, col] of Object.entries(UNICOS))
  idx.some((x) => x.t === tabla && x.c === col)
    ? ok(`${tabla}.${col}`)
    : mal(`${tabla}: falta un índice UNIQUE sobre ${col}`);

console.log("\nValores permitidos de metodo_pago");
const enumDe = (t) => porTabla.get(t)?.get("metodo_pago") ?? "";
["efectivo", "tarjeta", "QR"].every((m) => enumDe("pagos").includes(`'${m}'`))
  ? ok("pagos")
  : mal("pagos.metodo_pago debe admitir efectivo, tarjeta y QR");
["efectivo", "tarjeta", "QR", "transferencia"].every((m) =>
  enumDe("mensualidades_pagos").includes(`'${m}'`),
)
  ? ok("mensualidades_pagos")
  : mal("mensualidades_pagos.metodo_pago debe admitir además transferencia");

await db.end();
console.log(
  fallos
    ? `\n${fallos} problema(s). Corrige schema.sql (o la base) y vuelve a ejecutar.`
    : "\nEsquema OK.",
);
process.exitCode = fallos ? 1 : 0;
