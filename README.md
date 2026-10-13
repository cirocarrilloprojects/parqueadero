# ParkSystem

Sistema multi-empresa de gestión de parqueaderos: ingresos/salidas con cobro por tarifas
(minuto/hora/día/mixto), pagos mixtos, turnos de caja, mensualidades y reportes.

## Tecnologías

| Capa          | Stack                                                                                 |
| ------------- | ------------------------------------------------------------------------------------- |
| Frontend      | React 19, Vite, Tailwind CSS 4, React Router 7, TanStack Query, react-hook-form + zod |
| Backend       | Node.js 20+, Express 5, mysql2, zod, JWT (cookie httpOnly), bcryptjs, helmet          |
| Base de datos | MySQL 8.0.13+                                                                         |
| Pruebas       | Vitest (reglas de tarifas)                                                            |

## Arquitectura

```
backend/src/  routes -> controllers -> services -> repositories -> MySQL
              (HTTP)    (request/response)  (reglas de negocio)  (SQL parametrizado)
frontend/src/ pages -> components -> hooks (React Query) -> api (axios)
```

- Solo los _repositories_ escriben SQL; solo los _services_ contienen reglas de negocio.
- Aislamiento multi-empresa: toda consulta filtra por `id_empresa` del usuario autenticado.
- Fechas en UTC en BD; el frontend las muestra en la zona horaria configurada por la empresa.

## Requisitos

Node.js 20+, MySQL 8.0.13+, npm 10+.

## Instalación

```bash
git clone <repo> parqueadero && cd parqueadero

# 1) Base de datos
mysql -u root -p < backend/database/schema.sql
mysql -u root -p -e "CREATE USER 'parqueadero_app'@'localhost' IDENTIFIED BY 'cambia_esto';
  GRANT SELECT,INSERT,UPDATE,DELETE ON parqueadero.* TO 'parqueadero_app'@'localhost';"

# 2) Backend
cd backend
cp .env.example .env     # edita DB_* y genera JWT_SECRET (>= 32 caracteres)
npm install
npm run db:seed -- 'nueva123456'   # empresa demo + usuario admin
npm run dev              # http://localhost:3000

# 3) Frontend (otra terminal)
cd frontend
cp .env.example .env
npm install
npm run dev              # http://localhost:5173
```

Ingreso demo: NIT `900123456-7`, usuario `admin`, la contraseña que pasaste al seed.

## Scripts

| Dónde    | Comando         | Qué hace                  |
| -------- | --------------- | ------------------------- |
| backend  | `npm run dev`   | API con recarga (nodemon) |
| backend  | `npm start`     | API en producción         |
| backend  | `npm test`      | Tests de tarifas          |
| frontend | `npm run dev`   | Vite con proxy a `/api`   |
| frontend | `npm run build` | Genera `frontend/dist`    |

## Producción

1. `cd frontend && npm run build`
2. En `backend/.env`: `NODE_ENV=production`, `COOKIE_SECURE=true`, `CORS_ORIGIN=https://tu-dominio`
3. `cd backend && npm start` (el mismo servidor entrega `frontend/dist`). Ponlo detrás de HTTPS (nginx/Caddy).

## Seguridad

- JWT en cookie `httpOnly` + `SameSite=Lax`; secreto obligatorio validado al arrancar.
- Consultas 100 % parametrizadas; validación de entrada con zod; helmet; rate limit; límite de intentos de login.
- bcrypt (costo 12); mensajes de login que no revelan si la empresa o el usuario existen.
- Errores centralizados: el cliente nunca ve trazas internas.

## Estado de la migración

Fase 1 (esta): auth, ingreso/salida con pagos, tarifas (cálculo), base de frontend.
Fase 2: vehículos, tarifas (CRUD), tipos, usuarios, empresa/logo, turnos.
Fase 3: reportes (Excel/PDF), mensualidades, dashboard, impresión de tickets.
