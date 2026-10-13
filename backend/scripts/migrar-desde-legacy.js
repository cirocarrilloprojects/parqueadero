// backend/scripts/migrar-desde-legacy.js
// Uso:  LEGACY_DB_NAME=parqueadero node scripts/migrar-desde-legacy.js            (ensayo, revierte)
//       LEGACY_DB_NAME=parqueadero node scripts/migrar-desde-legacy.js --apply    (confirma)
// DB_NAME = base NUEVA (creada con schema.sql, sin datos de ejemplo). Las columnas destino son las de la fase 1.
import "dotenv/config";
import mysql from "mysql2/promise";
import { localToUtc } from "../src/utils/tz.js";

const APPLY = process.argv.includes("--apply");
const LEGACY = process.env.LEGACY_DB_NAME;
const NEW = process.env.DB_NAME;
for (const n of [LEGACY, NEW])
  if (!/^[A-Za-z0-9_]+$/.test(n ?? ""))
    throw new Error("LEGACY_DB_NAME y DB_NAME deben ser nombres simples");
if (LEGACY === NEW)
  throw new Error("La base vieja y la nueva no pueden ser la misma");

const db = await mysql.createConnection({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  timezone: "Z",
  dateStrings: true,
  decimalNumbers: true,
});
const r2 = (n) => Math.round(n * 100) / 100;
const leer = async (t) =>
  (await db.query(`SELECT * FROM \`${LEGACY}\`.\`${t}\``))[0];
const conteos = {};
async function insertar(tabla, cols, filas) {
  for (let i = 0; i < filas.length; i += 500) {
    const lote = filas.slice(i, i + 500);
    await db.query(
      `INSERT INTO \`${NEW}\`.\`${tabla}\` (${cols.map((c) => `\`${c}\``).join(",")}) VALUES ?`,
      [lote.map((f) => cols.map((c) => f[c] ?? null))],
    );
  }
  conteos[tabla] = (conteos[tabla] ?? 0) + filas.length;
}

const config = await leer("configuracion_empresa");
const tzDe = new Map(
  config.map((c) => [c.id_empresa, c.zona_horaria || "America/Bogota"]),
);
const utc = (emp, v) =>
  v
    ? localToUtc(tzDe.get(emp) ?? "America/Bogota", v)
        .toISOString()
        .slice(0, 19)
        .replace("T", " ")
    : null;
const mimeDe = (b) =>
  b?.[0] === 0xff && b[1] === 0xd8
    ? "image/jpeg"
    : b?.[0] === 0x89 && b[1] === 0x50
      ? "image/png"
      : b?.[0] === 0x47 && b[1] === 0x49
        ? "image/gif"
        : null;

await db.query("SET FOREIGN_KEY_CHECKS = 0");
await db.beginTransaction();
try {
  // Empresas y logos
  const empresas = await leer("empresas");
  await insertar(
    "empresas",
    [
      "id_empresa",
      "nombre",
      "nit",
      "direccion",
      "telefono",
      "email",
      "activa",
      "fecha_registro",
      "fecha_vencimiento",
      "plan",
    ],
    empresas.map((e) => ({
      ...e,
      fecha_registro: utc(e.id_empresa, e.fecha_registro),
      fecha_vencimiento: utc(e.id_empresa, e.fecha_vencimiento),
    })),
  );
  await insertar(
    "empresa_logos",
    ["id_empresa", "mime", "datos"],
    empresas
      .filter((e) => Buffer.isBuffer(e.logo_url) && mimeDe(e.logo_url))
      .map((e) => ({
        id_empresa: e.id_empresa,
        mime: mimeDe(e.logo_url),
        datos: e.logo_url,
      })),
  );
  await insertar(
    "configuracion_empresa",
    [
      "id_empresa",
      "horario_apertura",
      "horario_cierre",
      "iva_porcentaje",
      "moneda",
      "zona_horaria",
      "operacion_24h",
    ],
    config,
  );

  // Tipos (con la capacidad que antes vivía en capacidades_tipo)
  const cap = new Map(
    (await leer("capacidades_tipo")).map((c) => [c.id_tipo, c.capacidad_total]),
  );
  await insertar(
    "tipos_vehiculos",
    [
      "id_tipo",
      "id_empresa",
      "nombre",
      "codigo",
      "capacidad",
      "activo",
      "fecha_creacion",
    ],
    (await leer("tipos_vehiculos")).map((t) => ({
      ...t,
      capacidad: cap.get(t.id_tipo) ?? 0,
      fecha_creacion: utc(t.id_empresa, t.fecha_creacion),
    })),
  );

  await insertar(
    "usuarios",
    [
      "id_usuario",
      "id_empresa",
      "nombre",
      "usuario_login",
      "password_hash",
      "rol",
      "activo",
      "fecha_creacion",
      "ultimo_acceso",
    ],
    (await leer("usuarios")).map((u) => ({
      ...u,
      password_hash: u["contraseña"],
      fecha_creacion: utc(u.id_empresa, u.fecha_creacion),
      ultimo_acceso: utc(u.id_empresa, u.ultimo_acceso),
    })),
  );
  await insertar(
    "vehiculos",
    [
      "id_vehiculo",
      "id_empresa",
      "placa",
      "id_tipo",
      "color",
      "modelo",
      "fecha_registro",
    ],
    (await leer("vehiculos")).map((v) => ({
      ...v,
      placa: String(v.placa).trim().toUpperCase(),
      fecha_registro: utc(v.id_empresa, v.fecha_registro),
    })),
  );
  await insertar(
    "tarifas",
    [
      "id_tarifa",
      "id_empresa",
      "id_tipo",
      "valor_hora",
      "valor_minuto",
      "valor_dia_completo",
      "fecha_vigencia_desde",
      "fecha_vigencia_hasta",
      "activa",
      "modo_cobro",
      "paso_minutos_a_horas",
      "paso_horas_a_dias",
      "redondeo_horas",
      "redondeo_dias",
    ],
    (await leer("tarifas")).map((t) => ({
      ...t,
      fecha_vigencia_desde: utc(t.id_empresa, t.fecha_vigencia_desde),
      fecha_vigencia_hasta: utc(t.id_empresa, t.fecha_vigencia_hasta),
    })),
  );

  // Turnos y movimientos
  const turnos = (await leer("turnos")).map((t) => ({
    ...t,
    fecha_apertura: utc(t.id_empresa, t.fecha_apertura),
    fecha_cierre: utc(t.id_empresa, t.fecha_cierre),
  }));
  await insertar(
    "turnos",
    [
      "id_turno",
      "id_empresa",
      "id_usuario",
      "fecha_apertura",
      "base_inicial",
      "observacion_apertura",
      "fecha_cierre",
      "total_efectivo",
      "total_tarjeta",
      "total_qr",
      "total_general",
      "diferencia",
      "observacion_cierre",
      "estado",
    ],
    turnos,
  );
  const movs = (await leer("movimientos")).map((m) => ({
    ...m,
    fecha_entrada: utc(m.id_empresa, m.fecha_entrada),
    fecha_salida: utc(m.id_empresa, m.fecha_salida),
  }));
  await insertar(
    "movimientos",
    [
      "id_movimiento",
      "id_empresa",
      "id_vehiculo",
      "fecha_entrada",
      "fecha_salida",
      "id_tarifa",
      "total_a_pagar",
      "id_usuario_entrada",
      "id_usuario_salida",
      "estado",
    ],
    movs,
  );

  // Turno que contiene un instante (misma regla de ventana del original) o uno histórico por empresa+usuario
  const historicos = new Map();
  const turnoDe = (emp, usuario, fecha) => {
    const t = turnos.find(
      (x) =>
        x.id_empresa === emp &&
        x.fecha_apertura <= fecha &&
        (!x.fecha_cierre || fecha <= x.fecha_cierre),
    );
    if (t) return { id: t.id_turno };
    const k = `${emp}:${usuario}`;
    const h = historicos.get(k) ?? {
      emp,
      usuario,
      min: fecha,
      max: fecha,
      ef: 0,
      ta: 0,
      qr: 0,
      ref: {},
    };
    if (fecha < h.min) h.min = fecha;
    if (fecha > h.max) h.max = fecha;
    historicos.set(k, h);
    return { hist: h };
  };

  // Pagos: monto = aplicado; el vuelto sale del efectivo
  const porMov = new Map();
  for (const p of await leer("pagos"))
    (
      porMov.get(p.id_movimiento) ??
      porMov.set(p.id_movimiento, []).get(p.id_movimiento)
    ).push({ ...p, aplicado: Number(p.monto), recibido: Number(p.monto) });
  const totalDe = new Map(
    movs.map((m) => [
      m.id_movimiento,
      m.total_a_pagar == null ? null : Number(m.total_a_pagar),
    ]),
  );
  let descartados = 0;
  const pagosOut = [];
  for (const [idMov, lista] of porMov) {
    const total =
      totalDe.get(idMov) ?? lista.reduce((a, p) => a + p.aplicado, 0);
    let exceso = r2(
      Math.max(0, lista.reduce((a, p) => a + p.aplicado, 0) - total),
    );
    for (const metodos of [["efectivo"], ["tarjeta", "QR"]])
      for (const p of lista
        .filter((x) => metodos.includes(x.metodo_pago))
        .sort((a, b) => b.aplicado - a.aplicado)) {
        const q = Math.min(exceso, p.aplicado);
        p.aplicado = r2(p.aplicado - q);
        exceso = r2(exceso - q);
      }
    for (const p of lista) {
      if (p.aplicado <= 0) {
        descartados++;
        continue;
      } // efectivo entregado y devuelto por completo
      const fecha = utc(p.id_empresa, p.fecha_pago);
      const t = turnoDe(p.id_empresa, p.id_usuario, fecha);
      pagosOut.push({
        ...p,
        monto: p.aplicado,
        monto_recibido: p.recibido,
        fecha_pago: fecha,
        _t: t,
      });
      if (t.hist) {
        const k = { efectivo: "ef", tarjeta: "ta", QR: "qr" }[p.metodo_pago];
        if (k) t.hist[k] += p.aplicado;
      }
    }
  }

  const mensPagos = (await leer("mensualidades_pagos")).map((p) => {
    const fecha = utc(p.id_empresa, p.fecha_pago);
    const t = turnoDe(p.id_empresa, p.id_usuario, fecha);
    if (t.hist) {
      const k = { efectivo: "ef", tarjeta: "ta", QR: "qr" }[p.metodo_pago];
      if (k) t.hist[k] += Number(p.monto);
    }
    return { ...p, fecha_pago: fecha, _t: t };
  });

  // Turnos históricos para lo que no tenía turno
  for (const h of historicos.values()) {
    const [res] = await db.query(
      `INSERT INTO \`${NEW}\`.turnos (id_empresa, id_usuario, fecha_apertura, base_inicial, observacion_apertura, fecha_cierre, total_efectivo, total_tarjeta, total_qr, total_general, diferencia, observacion_cierre, estado)
       VALUES (?, ?, ?, 0, 'Histórico migrado (pagos sin turno)', ?, ?, ?, ?, ?, 0, 'Generado por la migración', 'cerrado')`,
      [
        h.emp,
        h.usuario,
        h.min,
        h.max,
        r2(h.ef),
        r2(h.ta),
        r2(h.qr),
        r2(h.ef + h.ta + h.qr),
      ],
    );
    h.id = res.insertId;
  }
  const idT = (p) => p._t.id ?? p._t.hist.id;
  await insertar(
    "pagos",
    [
      "id_pago",
      "id_empresa",
      "id_movimiento",
      "id_turno",
      "metodo_pago",
      "monto",
      "monto_recibido",
      "fecha_pago",
      "referencia_pago",
      "id_usuario",
    ],
    pagosOut.map((p) => ({ ...p, id_turno: idT(p) })),
  );

  const mens = await leer("mensualidades");
  await insertar(
    "mensualidades",
    [
      "id_mensualidad",
      "id_empresa",
      "id_vehiculo",
      "titular_nombre",
      "titular_documento",
      "titular_telefono",
      "titular_email",
      "valor_mensual",
      "fecha_inicio",
      "fecha_fin",
      "auto_renovar",
      "estado",
      "observaciones",
      "fecha_creacion",
    ],
    mens.map((m) => ({
      ...m,
      fecha_creacion: utc(m.id_empresa, m.fecha_creacion),
    })),
  );
  await insertar(
    "mensualidades_pagos",
    [
      "id_pago_mensualidad",
      "id_empresa",
      "id_mensualidad",
      "id_turno",
      "fecha_pago",
      "periodo_desde",
      "periodo_hasta",
      "metodo_pago",
      "monto",
      "referencia_pago",
      "id_usuario",
    ],
    mensPagos.map((p) => ({ ...p, id_turno: idT(p) })),
  );

  // Cuadre: lo cobrado debe coincidir con el total de cada movimiento finalizado que tuvo pagos
  const [desc] = await db.query(
    `SELECT COUNT(*) AS n FROM (SELECT m.id_movimiento FROM \`${NEW}\`.movimientos m JOIN \`${NEW}\`.pagos p ON p.id_movimiento = m.id_movimiento
      WHERE m.estado = 'finalizado' GROUP BY m.id_movimiento, m.total_a_pagar HAVING ABS(SUM(p.monto) - m.total_a_pagar) > 0.01) x`,
  );

  console.table(conteos);
  console.log(
    `Turnos históricos creados: ${historicos.size} | pagos descartados (efectivo devuelto íntegro): ${descartados}`,
  );
  console.log(
    `Movimientos cuyo total NO cuadra con sus pagos: ${desc[0].n}  ${desc[0].n ? "← revisar antes de aplicar" : "(ok)"}`,
  );
  if (APPLY) {
    await db.commit();
    console.log("✔ Migración confirmada.");
  } else {
    await db.rollback();
    console.log(
      "Ensayo terminado: no se guardó nada. Usa --apply para confirmar.",
    );
  }
} catch (e) {
  await db.rollback();
  console.error("✘ Falló y se revirtió todo:", e.message);
  process.exitCode = 1;
} finally {
  await db.query("SET FOREIGN_KEY_CHECKS = 1");
  await db.end();
}
