-- ============================================================
-- ParkSystem v2 - Esquema MySQL 8
-- Decisiones clave:
--  * Fechas en UTC (se convierten a la zona de la empresa solo al mostrar).
--  * Dinero en DECIMAL(12,2), nunca FLOAT.
--  * Índices únicos sobre columnas GENERADAS para imponer reglas de negocio
--    a nivel de BD (un vehículo activo, una tarifa activa por tipo, un turno
--    abierto por usuario). Un UNIQUE permite varios NULL, por eso la
--    columna generada vale NULL cuando la regla "no aplica".
-- ============================================================
CREATE DATABASE IF NOT EXISTS parqueadero
  CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
USE parqueadero;

CREATE TABLE empresas (
  id_empresa        INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre            VARCHAR(100) NOT NULL,
  nit               VARCHAR(20)  NOT NULL,
  direccion         VARCHAR(200),
  telefono          VARCHAR(20),
  email             VARCHAR(100),
  plan              ENUM('basico','premium','enterprise') NOT NULL DEFAULT 'basico',
  activa            BOOLEAN NOT NULL DEFAULT TRUE,
  fecha_registro    DATETIME NOT NULL DEFAULT (UTC_TIMESTAMP()),
  fecha_vencimiento DATETIME NULL,
  UNIQUE KEY uq_empresas_nit (nit)
) ENGINE=InnoDB;

-- El logo va en su propia tabla: así un SELECT de empresas nunca arrastra el BLOB.
CREATE TABLE empresa_logos (
  id_empresa INT UNSIGNED PRIMARY KEY,
  mime       VARCHAR(50) NOT NULL,
  datos      MEDIUMBLOB  NOT NULL,          -- máx. 16 MB; sobra para un logo de 2 MB
  updated_at DATETIME NOT NULL DEFAULT (UTC_TIMESTAMP()),
  CONSTRAINT fk_logo_empresa FOREIGN KEY (id_empresa) REFERENCES empresas(id_empresa) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Relación 1:1 con empresas (la PK es la FK). Se eliminan las columnas de capacidad:
-- ahora viven en tipos_vehiculos.capacidad (D8).
CREATE TABLE configuracion_empresa (
  id_empresa       INT UNSIGNED PRIMARY KEY,
  horario_apertura TIME NOT NULL DEFAULT '06:00:00',
  horario_cierre   TIME NOT NULL DEFAULT '22:00:00',
  operacion_24h    BOOLEAN NOT NULL DEFAULT FALSE,
  iva_porcentaje   DECIMAL(5,2) NOT NULL DEFAULT 19.00,
  moneda           CHAR(3)      NOT NULL DEFAULT 'COP',
  zona_horaria     VARCHAR(50)  NOT NULL DEFAULT 'America/Bogota',  -- IANA
  CONSTRAINT fk_cfg_empresa FOREIGN KEY (id_empresa) REFERENCES empresas(id_empresa) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE usuarios (
  id_usuario     INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_empresa     INT UNSIGNED NOT NULL,
  nombre         VARCHAR(100) NOT NULL,
  usuario_login  VARCHAR(50)  NOT NULL,
  password_hash  VARCHAR(255) NOT NULL,      -- bcrypt; antes "contraseña"
  rol            ENUM('admin','operador') NOT NULL,
  activo         BOOLEAN NOT NULL DEFAULT TRUE,
  fecha_creacion DATETIME NOT NULL DEFAULT (UTC_TIMESTAMP()),
  ultimo_acceso  DATETIME NULL,
  UNIQUE KEY uq_usuario_empresa (id_empresa, usuario_login),
  CONSTRAINT fk_usr_empresa FOREIGN KEY (id_empresa) REFERENCES empresas(id_empresa)
) ENGINE=InnoDB;

CREATE TABLE login_attempts (
  id_intento    BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_empresa    INT UNSIGNED NOT NULL,
  usuario_login VARCHAR(50)  NOT NULL,
  exitoso       BOOLEAN NOT NULL,
  ip_address    VARCHAR(45) NOT NULL,
  fecha_intento DATETIME NOT NULL DEFAULT (UTC_TIMESTAMP()),
  -- Índices compuestos que sirven exactamente a la consulta de "fallos recientes"
  KEY ix_la_usuario (id_empresa, usuario_login, fecha_intento),
  KEY ix_la_ip      (id_empresa, ip_address, fecha_intento),
  CONSTRAINT fk_la_empresa FOREIGN KEY (id_empresa) REFERENCES empresas(id_empresa)
) ENGINE=InnoDB;

CREATE TABLE tipos_vehiculos (
  id_tipo        INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_empresa     INT UNSIGNED NOT NULL,
  nombre         VARCHAR(50) NOT NULL,
  codigo         VARCHAR(20) NOT NULL,
  capacidad      INT UNSIGNED NOT NULL DEFAULT 0,
  activo         BOOLEAN NOT NULL DEFAULT TRUE,
  fecha_creacion DATETIME NOT NULL DEFAULT (UTC_TIMESTAMP()),
  UNIQUE KEY uq_tipo_codigo (id_empresa, codigo),
  CONSTRAINT fk_tipo_empresa FOREIGN KEY (id_empresa) REFERENCES empresas(id_empresa)
) ENGINE=InnoDB;

CREATE TABLE tarifas (
  id_tarifa            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_empresa           INT UNSIGNED NOT NULL,
  id_tipo              INT UNSIGNED NOT NULL,
  modo_cobro           ENUM('minuto','hora','dia','mixto') NOT NULL DEFAULT 'mixto',
  valor_minuto         DECIMAL(12,2) NOT NULL DEFAULT 0,
  valor_hora           DECIMAL(12,2) NOT NULL DEFAULT 0,
  valor_dia_completo   DECIMAL(12,2) NOT NULL DEFAULT 0,
  paso_minutos_a_horas SMALLINT UNSIGNED NOT NULL DEFAULT 0,  -- 0 = sin paso
  paso_horas_a_dias    SMALLINT UNSIGNED NOT NULL DEFAULT 0,  -- 0 = sin paso
  redondeo_horas       ENUM('arriba','exacto') NOT NULL DEFAULT 'arriba',
  redondeo_dias        ENUM('arriba','exacto') NOT NULL DEFAULT 'arriba',
  activa               BOOLEAN NOT NULL DEFAULT TRUE,
  vigente_desde        DATETIME NOT NULL DEFAULT (UTC_TIMESTAMP()),
  vigente_hasta        DATETIME NULL,
  -- Columna generada: vale id_tipo solo si la tarifa está activa, si no NULL.
  tipo_activo          INT UNSIGNED GENERATED ALWAYS AS (IF(activa, id_tipo, NULL)) STORED,
  -- => la BD garantiza UNA sola tarifa activa por (empresa, tipo)
  UNIQUE KEY uq_tarifa_activa (id_empresa, tipo_activo),
  CONSTRAINT chk_tarifa_valores CHECK (valor_minuto >= 0 AND valor_hora >= 0 AND valor_dia_completo >= 0),
  CONSTRAINT fk_tar_empresa FOREIGN KEY (id_empresa) REFERENCES empresas(id_empresa),
  CONSTRAINT fk_tar_tipo    FOREIGN KEY (id_tipo)    REFERENCES tipos_vehiculos(id_tipo)
) ENGINE=InnoDB;

CREATE TABLE vehiculos (
  id_vehiculo    INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_empresa     INT UNSIGNED NOT NULL,
  id_tipo        INT UNSIGNED NOT NULL,
  placa          VARCHAR(10) NOT NULL,
  color          VARCHAR(30) NOT NULL DEFAULT '',
  modelo         VARCHAR(50) NOT NULL DEFAULT '',
  fecha_registro DATETIME NOT NULL DEFAULT (UTC_TIMESTAMP()),
  UNIQUE KEY uq_placa_empresa (id_empresa, placa),
  CONSTRAINT fk_veh_empresa FOREIGN KEY (id_empresa) REFERENCES empresas(id_empresa),
  CONSTRAINT fk_veh_tipo    FOREIGN KEY (id_tipo)    REFERENCES tipos_vehiculos(id_tipo)
) ENGINE=InnoDB;

CREATE TABLE turnos (
  id_turno             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_empresa           INT UNSIGNED NOT NULL,
  id_usuario           INT UNSIGNED NOT NULL,
  estado               ENUM('abierto','cerrado') NOT NULL DEFAULT 'abierto',
  fecha_apertura       DATETIME NOT NULL DEFAULT (UTC_TIMESTAMP()),
  base_inicial         DECIMAL(12,2) NOT NULL DEFAULT 0,
  observacion_apertura VARCHAR(255) NULL,
  fecha_cierre         DATETIME NULL,
  total_efectivo       DECIMAL(12,2) NULL,
  total_tarjeta        DECIMAL(12,2) NULL,
  total_qr             DECIMAL(12,2) NULL,
  total_general        DECIMAL(12,2) NULL,
  diferencia           DECIMAL(12,2) NULL,
  observacion_cierre   VARCHAR(255) NULL,
  -- Un solo turno abierto por usuario (supuesto A2)
  usuario_abierto      INT UNSIGNED GENERATED ALWAYS AS (IF(estado = 'abierto', id_usuario, NULL)) STORED,
  UNIQUE KEY uq_turno_abierto (usuario_abierto),
  KEY ix_turno_empresa (id_empresa, fecha_apertura),
  CONSTRAINT fk_tur_empresa FOREIGN KEY (id_empresa) REFERENCES empresas(id_empresa),
  CONSTRAINT fk_tur_usuario FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario)
) ENGINE=InnoDB;

CREATE TABLE movimientos (
  id_movimiento      BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_empresa         INT UNSIGNED NOT NULL,
  id_vehiculo        INT UNSIGNED NOT NULL,
  id_tarifa          INT UNSIGNED NOT NULL,          -- tarifa "congelada" al ingreso (A1)
  id_usuario_entrada INT UNSIGNED NOT NULL,
  id_usuario_salida  INT UNSIGNED NULL,
  fecha_entrada      DATETIME NOT NULL DEFAULT (UTC_TIMESTAMP()),
  fecha_salida       DATETIME NULL,
  total_a_pagar      DECIMAL(12,2) NULL,
  estado             ENUM('activo','finalizado') NOT NULL DEFAULT 'activo',
  -- Un vehículo no puede tener dos movimientos activos (resuelve la carrera D1)
  vehiculo_activo    INT UNSIGNED GENERATED ALWAYS AS (IF(estado = 'activo', id_vehiculo, NULL)) STORED,
  UNIQUE KEY uq_mov_vehiculo_activo (vehiculo_activo),
  KEY ix_mov_empresa_entrada (id_empresa, fecha_entrada),
  KEY ix_mov_empresa_salida  (id_empresa, estado, fecha_salida),
  CONSTRAINT chk_mov_fechas CHECK (fecha_salida IS NULL OR fecha_salida >= fecha_entrada),
  CONSTRAINT fk_mov_empresa  FOREIGN KEY (id_empresa)         REFERENCES empresas(id_empresa),
  CONSTRAINT fk_mov_vehiculo FOREIGN KEY (id_vehiculo)        REFERENCES vehiculos(id_vehiculo),
  CONSTRAINT fk_mov_tarifa   FOREIGN KEY (id_tarifa)          REFERENCES tarifas(id_tarifa),
  CONSTRAINT fk_mov_usr_in   FOREIGN KEY (id_usuario_entrada) REFERENCES usuarios(id_usuario),
  CONSTRAINT fk_mov_usr_out  FOREIGN KEY (id_usuario_salida)  REFERENCES usuarios(id_usuario)
) ENGINE=InnoDB;

CREATE TABLE pagos (
  id_pago        BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_empresa     INT UNSIGNED NOT NULL,
  id_movimiento  BIGINT UNSIGNED NOT NULL,
  id_turno       INT UNSIGNED NOT NULL,              -- vínculo real con la caja (D5)
  id_usuario     INT UNSIGNED NOT NULL,
  metodo_pago    ENUM('efectivo','tarjeta','QR','transferencia') NOT NULL,
  monto          DECIMAL(12,2) NOT NULL,             -- APLICADO al cobro (ya sin vuelto)
  monto_recibido DECIMAL(12,2) NOT NULL,             -- lo que entregó el cliente
  referencia     VARCHAR(100) NULL,
  fecha_pago     DATETIME NOT NULL DEFAULT (UTC_TIMESTAMP()),
  KEY ix_pago_mov   (id_movimiento),
  KEY ix_pago_turno (id_turno, metodo_pago),
  KEY ix_pago_fecha (id_empresa, fecha_pago),
  CONSTRAINT chk_pago_monto CHECK (monto > 0 AND monto_recibido >= monto),
  CONSTRAINT fk_pago_empresa FOREIGN KEY (id_empresa)    REFERENCES empresas(id_empresa),
  CONSTRAINT fk_pago_mov     FOREIGN KEY (id_movimiento) REFERENCES movimientos(id_movimiento),
  CONSTRAINT fk_pago_turno   FOREIGN KEY (id_turno)      REFERENCES turnos(id_turno),
  CONSTRAINT fk_pago_usuario FOREIGN KEY (id_usuario)    REFERENCES usuarios(id_usuario)
) ENGINE=InnoDB;

CREATE TABLE mensualidades (
  id_mensualidad    INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_empresa        INT UNSIGNED NOT NULL,
  id_vehiculo       INT UNSIGNED NOT NULL,
  titular_nombre    VARCHAR(120) NOT NULL,
  titular_documento VARCHAR(40),
  titular_telefono  VARCHAR(30),
  titular_email     VARCHAR(120),
  valor_mensual     DECIMAL(12,2) NOT NULL,
  fecha_inicio      DATE NOT NULL,
  fecha_fin         DATE NULL,
  auto_renovar      BOOLEAN NOT NULL DEFAULT TRUE,
  estado            ENUM('activa','vencida','cancelada') NOT NULL DEFAULT 'activa',
  observaciones     VARCHAR(255) NOT NULL DEFAULT '',
  fecha_creacion    DATETIME NOT NULL DEFAULT (UTC_TIMESTAMP()),
  KEY ix_mens_estado (id_empresa, estado),
  KEY ix_mens_veh    (id_empresa, id_vehiculo),
  CONSTRAINT fk_mens_empresa  FOREIGN KEY (id_empresa)  REFERENCES empresas(id_empresa),
  CONSTRAINT fk_mens_vehiculo FOREIGN KEY (id_vehiculo) REFERENCES vehiculos(id_vehiculo)
) ENGINE=InnoDB;

CREATE TABLE mensualidades_pagos (
  id_pago_mensualidad INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_empresa     INT UNSIGNED NOT NULL,
  id_mensualidad INT UNSIGNED NOT NULL,
  id_turno       INT UNSIGNED NOT NULL,
  id_usuario     INT UNSIGNED NOT NULL,
  periodo_desde  DATE NOT NULL,
  periodo_hasta  DATE NOT NULL,
  metodo_pago    ENUM('efectivo','tarjeta','QR','transferencia') NOT NULL DEFAULT 'efectivo',
  monto          DECIMAL(12,2) NOT NULL,
  referencia     VARCHAR(100) NULL,
  fecha_pago     DATETIME NOT NULL DEFAULT (UTC_TIMESTAMP()),
  KEY ix_mp_fecha (id_empresa, fecha_pago),
  CONSTRAINT chk_mp_monto   CHECK (monto > 0),
  CONSTRAINT chk_mp_periodo CHECK (periodo_hasta >= periodo_desde),
  CONSTRAINT fk_mp_empresa  FOREIGN KEY (id_empresa)     REFERENCES empresas(id_empresa),
  CONSTRAINT fk_mp_mens     FOREIGN KEY (id_mensualidad) REFERENCES mensualidades(id_mensualidad),
  CONSTRAINT fk_mp_turno    FOREIGN KEY (id_turno)       REFERENCES turnos(id_turno),
  CONSTRAINT fk_mp_usuario  FOREIGN KEY (id_usuario)     REFERENCES usuarios(id_usuario)
) ENGINE=InnoDB;