# Frontend - Ferretería Ambiente Murano 3D

Interfaz POS para la ferretería, construida con React 18 + Vite + TypeScript.

## Requisitos
- Node 20+
- Docker (para entorno completo con backend)

## Desarrollo local (con proxy Vite)

```bash
cd domain/frontend
npm install
npm run dev
```

El proxy de Vite (configurado en `vite.config.ts`) redirige:
- `/api/auth/*` → `http://localhost:8081` (AuthCore)
- `/api/*` → `http://localhost:8085` (Domain service)

Esto evita CORS en desarrollo.

## Pruebas

```bash
npm run build   # compila TypeScript y genera build de producción
npm test        # ejecuta Vitest
```

## Producción (Docker)

Desde la carpeta `domain/` (con `authcore/` clonado junto a `domain/`):

```bash
cd domain
docker compose up -d --build
```

Esto levanta:
- `authcore-db` (MySQL 8.4) - puerto interno 3306
- `authcore` (Spring Boot 4.1.1) - puerto 8081
- `domain-db` (PostgreSQL 16) - puerto interno 5432
- `domain` (Spring Boot 3.5.6) - puerto 8085
- `frontend` (nginx + SPA) - puerto 8080

La interfaz queda disponible en `http://localhost:8080`.

## Estructura
- `src/` - Código fuente React
- `nginx.conf` - Configuración nginx para SPA + proxy API
- `Dockerfile` - Multi-etapa: build con Node 20 → runtime nginx
- `vite.config.ts` - Configuración Vite con proxy de desarrollo