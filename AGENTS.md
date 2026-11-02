# AGENTS.md

Guía para agentes que trabajan en este repositorio. Describe el stack, los comandos reales, la
arquitectura y las convenciones que ya usa el proyecto. Cuando algo aquí no coincida con el código,
manda el código: corrige esta guía en el mismo cambio.

## Qué es este repositorio

POS e inventario de **Ferretería Ambiente Murano 3D** (Cúcuta). Dos piezas en el mismo repositorio:

- **Backend** (`src/`, `pom.xml`): servicio de dominio Spring Boot 3.5.6 / Java 17, arquitectura
  hexagonal. Catálogo, proveedores, ventas con factura PDF, compras, comparación de precios y reporte
  diario.
- **Frontend** (`frontend/`): SPA React 19 + Vite + TypeScript + Tailwind v4 + shadcn/ui.

El servicio de autenticación (AuthCore, puerto 8081) vive en un repositorio aparte y no está aquí.
En desarrollo, el proxy de Vite envía `/api/auth/*` a AuthCore y `/api/*` a este servicio.

Para levantar la demo completa (los dos repos como hermanos, datos sembrados y login), sigue
`docs-tecnicos/puesta-en-marcha-demo.md`. Es la fuente única: cualquier otra nota sobre el arranque
conjunto debe remitir allí.

## Comandos

### Backend

```bash
cd domain
JWT_SECRET_BASE64=<base64> mvn -B verify   # compila y corre toda la suite
JWT_SECRET_BASE64=<base64> mvn -B test     # solo pruebas
```

- `JWT_SECRET_BASE64` es obligatorio: sin esa variable la aplicación no arranca (falla rápido a
  propósito). No la escribas en `application.yml` ni la commitees.
- Perfil `prod` (PostgreSQL): `SPRING_PROFILES_ACTIVE=prod` más `DB_URL`, `DB_USER`, `DB_PASSWORD`.
- Dev/test usan H2 en memoria (`MODE=PostgreSQL`).
- No hay Maven wrapper: usa `mvn` del sistema (3.9+).

### Frontend

```bash
cd domain/frontend
npm install
npm run dev      # Vite en http://localhost:5173 (proxy a 8081 y 8085)
npm test         # Vitest (run), jsdom
npm run lint     # oxlint
npm run build    # tsc -b && vite build
```

### Desarrollo con recarga

Todo corre en Docker con el código montado; no se reconstruyen imágenes por cada cambio.

```bash
cd domain
docker compose -f docker-compose.yml -f docker-compose.dev.yml build     # una sola vez
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d     # sin --build
```

- AuthCore (`docker/authcore.dev.Dockerfile`): `gradle -t classes` + `bootRun` con DevTools inyectado
  por `docker/authcore-devtools.init.gradle` (no se toca `authcore/build.gradle`).
- Domain (`docker/domain.dev.Dockerfile`): `mvn compile` al detectar cambios en `src/` o `pom.xml`
  (`inotifywait`) y reinicio con DevTools; usa PostgreSQL vía las variables del compose.
- Frontend (`frontend/Dockerfile.dev`): Vite con HMR en http://localhost:8080; el proxy apunta a
  `http://authcore:8081` y `http://domain:8085` con `VITE_AUTH_TARGET` / `VITE_DOMAIN_TARGET`.
- Las imágenes de desarrollo (`pi-*-dev`) no pisan las de producción. La primera ejecución descarga
  dependencias; quedan en volúmenes (`maven-cache`, `gradle-cache`).

### Sistema completo (con AuthCore y el seed de la demo)

Requiere `authcore/` clonado junto a `domain/`. La guía detallada está en
`docs-tecnicos/puesta-en-marcha-demo.md`.

```bash
cd domain
./scripts/generar-env.sh
docker compose -f docker-compose.yml -f docker-compose.dev.yml build   # una sola vez
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d
./scripts/seed.sh                                                     # datos con las fechas de hoy
# http://localhost:8080 → admin / admin123
```

`docker compose up -d --build` (sin overlay) levanta las imágenes de producción locales, también en
8080; `docker-compose.prod.yml` publica solo el puerto 80.

## Arquitectura del backend

Paquete base: `co.edu.unipamplona.ferreteria`.

- `domain/` — modelo y reglas de negocio puras (`Producto`, `Factura`, `Compra`, `Dinero`...).
- `application/` — casos de uso y puertos.
- `infrastructure/` — adaptadores REST, persistencia JPA, PDF (Thymeleaf + openhtmltopdf),
  almacenamiento (Cloudinary) y seguridad.
- `src/main/resources/templates/` — plantillas HTML de factura y reporte diario; `fonts/` (Lato +
  IBM Plex Mono, OFL) e `images/logo.jpg` son los recursos visuales del PDF.
- `src/test/` — pruebas por capa: `domain`, `application`, `contract`, `infrastructure`,
  `architecture` (ArchUnit) y `testsupport`.

Reglas:

- La dependencia apunta hacia `domain`. `domain` no importa Spring, JPA ni HTTP.
- Los adaptadores abren su propia transacción (`open-in-view: false`); nada de lazy loading en REST.
- El total oficial de una venta lo calcula el servidor, línea a línea (IVA incluido). El cliente solo
  muestra un estimado.
- Los contratos de repositorio se prueban contra las dos implementaciones (memoria y JPA).
- El PDF de la factura se genera al emitir y se publica en Cloudinary (`pdfUrl`). Es best-effort:
  si Cloudinary falla, la venta se completa sin URL y se reintenta al descargar o anular.
- `POST /api/seed` (ADMIN) reinicia la base y crea 20 facturas con las fechas del día de ejecución
  (hora de Bogotá): 7 de hoy (una anulada), 13 repartidas en los últimos 25 días, 6 productos en stock
  bajo y compras de hace 40 a 21 días. No hay scheduler: se ejecuta a mano (`./scripts/seed.sh`).
  También genera y publica el PDF de cada factura cuando Cloudinary está configurado.
- El total también se imprime en letras con `NumeroALetras`; si cambias el formato monetario, ajusta
  su prueba.
- `CLOUDINARY_URL` (firmado) o `CLOUDINARY_CLOUD_NAME` + `CLOUDINARY_UPLOAD_PRESET` (unsigned)
  llegan por entorno y nunca se escriben en `application.yml`.
- Las listas paginan con `pagina` (1-based) y `tamano` (máx. 100) y devuelven
  `{ total, pagina, tamano, totalPaginas, ... }`; las tablas embebidas en un documento usan sus propios
  parámetros (`paginaProductos`, `paginaFacturas`, `paginaOfertas`).

## Arquitectura del frontend

- `src/api/` — un cliente HTTP único (`client.ts`) y un módulo por recurso. Siempre mismo origen
  (`/api`), sin URLs absolutas; el proxy de Vite/nginx resuelve el resto.
- `src/auth/` — `AuthProvider`, JWT, rutas privadas y roles (`USER`, `ADMIN`).
- `src/pages/` — una pantalla por archivo; `src/components/` para piezas compartidas.
- `src/components/ui/` — primitivas shadcn/ui (Button, Card, Input, Checkbox, Select).
- `src/components/Campo.tsx` — envoltorios accesibles para `input`, `select` y `textarea` (label,
  error y `aria-describedby`); úsalos en las pantallas migradas.
- `src/lib/`, `src/hooks/`, `src/stores/` — utilidades, hooks y estado de UI (Zustand).
- `usePaginaUrl` mantiene `pagina` y los filtros en la URL; `Paginador` es el pie común de las tablas.
  Cambiar un filtro vuelve a la página 1 y la página fuera de rango se normaliza a la última válida.
- Alias de imports: `@/` apunta a `src/`. Úsalo en código nuevo.
- `src/index.css` contiene los tokens de diseño y estilos globales.

## Convenciones

- **Idioma de dominio, UI y pruebas: español.** Nombres de clases, campos, rutas, textos y títulos de
  pruebas están en español (`PuntoVenta`, `emitirFactura`, `formatearPesos`). Mantenlo así.
- Los nombres de las pruebas citan la historia de usuario o el requisito cuando aplica
  (`T3.4, RF-11, RF-12`). Esa referencia es parte de la especificación: no la borres.
- **Las pruebas son la especificación de la UI.** Textos como "Total estimado", roles y etiquetas
  accesibles se verifican en Vitest. Si cambias una etiqueta visible, actualiza su prueba en el mismo
  cambio.
- Pruebas de frontend: Vitest + Testing Library + `src/test/servidor.ts` (servidor falso por
  `METHOD /ruta`) y `renderApp()` de `src/test/utilidades.tsx`. No inventes un segundo patrón.
- No dejes datos mock como estado inicial de una pantalla real. Los mocks solo valen como fixture de
  prueba o detrás de un flag de desarrollo explícito.
- Errores de API: usa `ApiError` (`status`, `message`, `detalles`). Un 400 marca campos; un 409 lista
  faltantes. Conserva el estado del formulario cuando el servidor rechaza.
- Accesibilidad: mantén roles, `aria-label`, `aria-describedby` y foco visibles; hay pruebas que los
  consultan por rol y nombre accesible.
- Commits: conventional commits (`feat:`, `fix:`, `docs:`...). Sin atribución de IA ni
  `Co-Authored-By`.
- Nunca commitees secretos. `.env`, `target/`, `node_modules/`, `dist/` y `scripts/evidencia/` están
  ignorados.

## Sistema de diseño

- Estilo "achromatic ledger" (taste-skill, seed 1731905719): fondo piedra, superficies blancas,
  acción primaria casi negra y un solo tono de datos (`--hue`). No introduzcas colores fuera de los
  tokens. Excepción deliberada: la gráfica de tendencia de `Inicio` va en escala de grises con
  `--foreground` (casi negro en claro, casi blanco en oscuro), por pedido explícito.
- Usa los tokens de `src/index.css` (`--ground`, `--surface`, `--text`, `--muted`, `--border`,
  `--hue`, píldoras de estado...) y las primitivas de `src/components/ui/`.
- Todas las pantallas usan Tailwind + shadcn, igual que los componentes compartidos `Campo` y
  `Confirmacion`. Quedan restos legacy aislados: `Login` (clases `.login-*` y el botón `.btn`),
  `BuscadorProductos` (`.buscador`/`.sugerencias`), `FormFields` (`.form-group`/`.ayuda-campo`/
  `.error-campo`), `MensajeError` (`.mensaje-error`) y el aviso de sesión (`.aviso`). No mezcles esos
  restos con bloques nuevos.
- Números monetarios: `formatearPesos()` y `font-variant-numeric: tabular-nums`. No formatees a mano.
- Fechas: `Intl.DateTimeFormat` con `America/Bogota`.
- Modo oscuro: se controla con la clase `html.dark`; todo token debe tener su par oscuro.

## Verificación antes de terminar

1. Backend: `JWT_SECRET_BASE64=<base64> mvn -B verify`.
2. Frontend: `npm test`, `npm run lint`, `npm run build`.
3. Si tocaste una pantalla, ábrela a 1440, 768 y 390 px (incluido modo oscuro) y comprueba foco,
   estados vacíos, error y carga.
4. No declares una verificación que no ejecutaste.

## Documentación

- `README.md` — operación, scripts y despliegue.
- `docs-tecnicos/puesta-en-marcha-demo.md` — **guía única** para levantar los dos repos, sembrar la
  demo y ver lo mismo que en la presentación (incluye credenciales, scripts y problemas comunes).
- `frontend/README.md` — desarrollo del frontend (puede estar desactualizado en versiones; manda
  `frontend/package.json`).
- `docs/modelo-datos.md` — modelo de datos.
- `docs-tecnicos/` — API OpenAPI, matriz de pruebas, respaldo, rendimiento y despliegue en AWS.
- `scripts/` — generación de `.env`, seed de demo, humo E2E, respaldo/restauración, verificación de secretos.
