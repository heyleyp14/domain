# Puesta en marcha de la demo

Guía para dejar el sistema igual que en la presentación: los **dos repositorios** (`domain` y
`authcore`), el **frontend** con datos de hoy y el usuario `admin` con su foto.

> **Resumen para agentes** (el detalle está abajo):
>
> ```bash
> # Los dos repos deben quedar hermanos: pi/domain y pi/authcore
> cd domain
> ./scripts/generar-env.sh
> ./scripts/verificar-secreto.sh
> docker compose -f docker-compose.yml -f docker-compose.dev.yml build
> docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d
> ./scripts/seed.sh
> ```
>
> Abrir <http://localhost:8080> e iniciar sesión con `admin` / `admin123`.
> Si algo no cuadra, ver [Problemas comunes](#problemas-comunes).

## Qué se levanta

| Servicio | Imagen / stack | Puerto en el host | Para qué |
|---|---|---|---|
| `frontend` | Vite (dev) / nginx (base) | 8080 | SPA React; proxy de `/api/auth` a AuthCore y `/api` a domain |
| `authcore` | Spring Boot 4.1.1 / Java 21 | 8081 | Usuarios, login y JWT |
| `domain` | Spring Boot 3.5.6 / Java 17 | 8085 | Catálogo, ventas, compras, reportes y PDFs |
| `domain-db` | PostgreSQL 16 | interno | Datos del dominio |
| `authcore-db` | MySQL 8.4 | interno | Usuarios y roles |

El compose integrado vive en `domain/docker-compose.yml` (proyecto `pi`). El `docker-compose.yml` de
`authcore` es solo para trabajar en AuthCore aislado; **la demo usa el de `domain`**.

## Requisitos

- Docker Engine con Compose v2 (`docker compose version`).
- `git`, `bash`, `curl` y `jq` (los usan `scripts/seed.sh` y `scripts/humo.sh`).
- Puertos libres: 8080, 8081 y 8085.
- Opcional, solo para correr pruebas en el host: JDK 17/21, Maven 3.9+, Node 20+.

## Estructura de carpetas

```text
pi/
├── authcore/     # git@github.com:heyleyp14/authcore.git
└── domain/       # git@github.com:heyleyp14/domain.git
```

**No cambies estos nombres ni la relación de hermanos.** El overlay de desarrollo de `domain` monta
`../authcore` dentro del contenedor de AuthCore; si no existe, el servicio no levanta.

```bash
git clone git@github.com:heyleyp14/domain.git
git clone git@github.com:heyleyp14/authcore.git
```

## Primera puesta en marcha (desarrollo, con recarga)

Desde `domain/`:

```bash
./scripts/generar-env.sh          # crea .env con secretos; si ya existe, no lo toca
./scripts/verificar-secreto.sh    # JWT_SECRET y JWT_SECRET_BASE64 deben coincidir
docker compose -f docker-compose.yml -f docker-compose.dev.yml build
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d
```

- La primera vez descarga Maven, Gradle y npm; puede tardar varios minutos.
- El código entra por bind mount: editar un `.java`, `.tsx` o `.css` recompila y recarga solo.
- Logs: `docker compose -f docker-compose.yml -f docker-compose.dev.yml logs -f authcore domain frontend`.
- Estado: `docker compose ps` debe mostrar los 5 servicios en `Up` (las bases en `healthy`).

Variantes del compose (misma carpeta `domain/`):

| Comando | Qué hace | Frontend |
|---|---|---|
| `-f docker-compose.yml -f docker-compose.dev.yml` | Desarrollo con recarga (la de esta guía) | 8080 → Vite 5173 |
| `docker compose up -d --build` | Imágenes de producción locales | 8080 → nginx 80 |
| `-f docker-compose.yml -f docker-compose.prod.yml` | Servidor pequeño; solo publica el frontend | 80 → nginx 80 |

El perfil `SPRING_PROFILES_ACTIVE=prod` del compose significa **PostgreSQL**, no un despliegue real.
La guía de despliegue está en `despliegue-aws.md`.

## Variables de entorno (`.env`)

El archivo va en **`domain/.env`** (nunca en `authcore/`) y está en `.gitignore`: no lo commitees. El
compose de `domain` se lo entrega a los dos servicios, así que el JWT es el mismo para ambos.

### Cómo obtenerlo

| Forma | Cuándo usarla | Qué hace |
|---|---|---|
| `./scripts/generar-env.sh` | Caso normal | Crea secretos nuevos y `ADMIN_PASSWORD=admin123`. Si `.env` ya existe, no lo toca |
| Copiar un `.env` existente | Replicar la misma demo (mismo Cloudinary) | Conserva la pareja JWT y un `ADMIN_PASSWORD` que exista en la base de AuthCore |

### Claves

| Clave | ¿Obligatoria? | Quién la usa | Nota |
|---|---|---|---|
| `JWT_SECRET` | Sí | AuthCore (firma) | 32+ bytes; debe corresponder a `JWT_SECRET_BASE64` |
| `JWT_SECRET_BASE64` | Sí | domain (valida) | El mismo secreto en Base64; el compose no arranca sin ella |
| `MYSQL_ROOT_PASSWORD` | Sí | compose | El compose la exige (`:?`) |
| `MYSQL_PASSWORD` | Sí | compose | Usuario `authcore` de MySQL |
| `POSTGRES_PASSWORD` | Sí | compose | PostgreSQL del dominio |
| `MYSQL_DATABASE` | Default `authcoredb` | AuthCore | |
| `MYSQL_USER` | Default `authcore` | AuthCore | |
| `POSTGRES_DB` | Default `ferreteria` | domain | |
| `POSTGRES_USER` | Default `ferreteria` | domain | |
| `ADMIN_PASSWORD` | Sí para scripts | `seed.sh`, `humo.sh` | Debe coincidir con el admin real de AuthCore; en una base nueva es `admin123` |
| `NEGOCIO_NOMBRE`, `NEGOCIO_CIUDAD` | Opcional | PDFs | Defaults del script |
| `NEGOCIO_NIT`, `NEGOCIO_DIRECCION`, `NEGOCIO_TELEFONO` | Opcional | PDFs | Vacíos por defecto |
| `CLOUDINARY_URL` | Opcional | PDFs e imágenes | Modo firmado |
| `CLOUDINARY_CLOUD_NAME` + `CLOUDINARY_UPLOAD_PRESET` | Opcional | PDFs e imágenes | Modo unsigned; alternativa a `CLOUDINARY_URL` |

`./scripts/verificar-secreto.sh` comprueba que la pareja JWT coincide. `.env.example` es solo una
plantilla; la fuente de verdad es `scripts/generar-env.sh`.

### Cloudinary es opcional

Sin credenciales la demo se ve igual: el seed, la gráfica, el avatar del admin (URL pública) y la
descarga de PDFs siguen funcionando. Lo que cambia:

- Los PDFs no quedan publicados en `pdfUrl` (se generan al descargarlos).
- `POST /api/auth/me/image` responde 503 y no se puede cambiar la foto desde **Perfil**.

Para la paridad total comparte `CLOUDINARY_CLOUD_NAME` + `CLOUDINARY_UPLOAD_PRESET` (unsigned) o una
`CLOUDINARY_URL` firmada, por un canal privado. No pegues secretos en el chat ni en git.

## Sembrar la demo

El seed se ejecuta **a mano**; no hay tareas automáticas.

```bash
./scripts/seed.sh
```

El script lee `ADMIN_PASSWORD` de `.env` (por defecto `admin123`), inicia sesión como `admin` y llama
a `POST /api/seed`. Qué deja en la base del dominio:

- 20 proveedores, 20 productos, 20 compras y 20 facturas.
- Fechas calculadas **el día de la ejecución** (hora de Bogotá): 7 facturas de hoy (1 anulada) y 13
  repartidas entre hace 1 y 25 días; compras de hace 40 a 21 días.
- 6 productos en stock bajo: `P-001` a `P-006` con stock 0, 0, 1, 2, 3 y 5.
- Si Cloudinary está configurado, publica el PDF de cada factura.
- **No toca los usuarios de AuthCore**: esos los siembra AuthCore por su cuenta.

Detalle completo en el `README.md` de `domain` (sección "Seed de desarrollo").

## Usuarios y credenciales

AuthCore siembra usuarios **solo si la tabla `users` está vacía** (`DataSeedRunner`):

| Usuario | Contraseña | Roles |
|---|---|---|
| `admin` | `admin123` (o `ADMIN_PASSWORD` de `.env`) | `ADMIN`, `USER` |
| `maria.gomez`, `juan.perez`, `ana.rodriguez`, `carlos.mendoza`, `lucia.fernandez`, `diego.ramirez`, `sofia.torres`, `miguel.vargas`, `valentina.rojas` | `Demo1234` | `USER` |

- La foto del `admin` es un retrato real alojado en Cloudinary; no hace falta configurar credenciales
  para verla.
- `scripts/cambiar-clave-admin.sh` cambia la contraseña del admin y actualiza `ADMIN_PASSWORD` en
  `.env` (lo usan `seed.sh` y `humo.sh`).
- Para desactivar el seed de usuarios: `AUTHCORE_SEED_ENABLED=false` en el entorno de AuthCore.

## Cómo se debe ver

Abrir <http://localhost:8080>, iniciar sesión con `admin` / `admin123` y comprobar:

| Pantalla | Qué debe mostrar |
|---|---|
| **Inicio** | Ventas de hoy: 6 facturas emitidas, 1 anulada, 54 unidades, total `$ 1.062.840,00`. Tendencia con historia y línea **negra en tema claro / gris clara en oscuro**. Stock bajo con 6 productos (dos "Agotado"). Más vendidos con 6 productos de 4 unidades. |
| **Productos** | 20 productos (`P-001` a `P-020`). |
| **Proveedores** | 20 proveedores (`Ferretería 01` a `Ferretería 20`). |
| **Compras** | 20 compras con fechas recientes. |
| **Comparar precios** | `P-001` con 3 proveedores y precio vigente. |
| **Facturas** | 20 facturas; la de hoy con una anulada. |
| **Reporte diario** | El día de hoy ya seleccionado y con datos. |
| **Barra lateral** | `admin` con retrato real; "Modo oscuro" alterna el tema. |

Los montos del día y de la tendencia son deterministas para el seed (`$ 1.062.840,00` y
`$ 3.365.660,00`); lo único que cambia al ejecutarlo otro día son las fechas. Si los importes no
coinciden, el seed no se ejecutó o la base tiene datos de otra corrida.

## Scripts y cuándo usarlos

Todos se ejecutan desde `domain/`.

| Script | Para qué | Cuándo |
|---|---|---|
| `./scripts/generar-env.sh` | Crea `.env` con secretos aleatorios y `ADMIN_PASSWORD=admin123`. No pisa un `.env` existente | Primera vez |
| `./scripts/verificar-secreto.sh` | Comprueba que `JWT_SECRET` y `JWT_SECRET_BASE64` coinciden | Tras generar o cambiar `.env` |
| `./scripts/seed.sh` | Reinicia la base del dominio y crea la demo con fechas de hoy | Antes de presentar o para volver al estado base |
| `./scripts/humo.sh` | Prueba de humo E2E (HU-1 a HU-12 + RNF-09). **Crea usuarios y datos** | Verificación, no antes de una demo |
| `./scripts/humo.sh --evidencia` | Igual, y guarda el resultado en `scripts/evidencia/` | Evidencia de pruebas |
| `./scripts/verificar-authcore.sh` | Revisa criterios de AuthCore en su base y logs; informa brechas D2 | Auditoría |
| `./scripts/respaldo.sh` / `./scripts/restaurar.sh` | Copia y restaura las dos bases en `respaldos/` | Antes de tocar datos |
| `./scripts/rendimiento.sh` | Mide búsqueda con 5000 productos. **Solo instancia de prueba** | Medición RNF-07 |
| `./scripts/verificar-openapi.py` | Compara rutas de controladores con la especificación OpenAPI | Tras cambiar endpoints |
| `./scripts/cambiar-clave-admin.sh` | Cambia la clave del admin en MySQL y en `.env` | Entorno compartido |

## Pruebas

```bash
# Domain (backend)
cd domain
set -a; source .env; set +a
mvn -B verify

# Frontend
cd domain/frontend
npm install
npm test && npm run lint && npm run build

# AuthCore (necesita MySQL)
cd authcore
docker compose up -d authcore-db
SPRING_DATASOURCE_URL='jdbc:mysql://localhost:3306/authcoredb?useSSL=false&allowPublicKeyRetrieval=true' \
SPRING_DATASOURCE_USERNAME=authcore SPRING_DATASOURCE_PASSWORD=authcore \
  bash gradlew test
```

El wrapper de Gradle no tiene bit de ejecución: usa `bash gradlew`. El `docker compose` de `authcore`
publica MySQL en 3306; el integrado no lo publica, así que no choca.

## Reiniciar la demo desde cero

Si los datos o los usuarios quedaron en un estado raro, la forma limpia es borrar los volúmenes:

```bash
cd domain
docker compose -f docker-compose.yml -f docker-compose.dev.yml down -v
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d
./scripts/seed.sh
```

> `down -v` borra **las dos bases** (dominio y AuthCore). AuthCore volverá a crear los 10 usuarios en
> el siguiente arranque. No lo ejecutes si hay datos que quieras conservar.

Si solo quieres refrescar el dominio, `./scripts/seed.sh` es suficiente: no toca los usuarios.

## Problemas comunes

| Síntoma | Causa y solución |
|---|---|
| `define POSTGRES_PASSWORD in .env` o "variable no definida" | Falta `.env`: `./scripts/generar-env.sh` |
| AuthCore no arranca y el build falla con `../authcore` | Los repos no están como hermanos. Clonar `authcore` al lado de `domain` |
| El frontend carga pero las tarjetas están vacías | Falta el seed o la base tiene datos de otro día: `./scripts/seed.sh` |
| Acabo de correr el seed y el front sigue igual | La pestaña no refetchea sola al ejecutar el seed. Vuelve a la pestaña o recarga con `Ctrl+Shift+R` |
| El login falla con `admin` | La base de AuthCore ya existía con otra clave, o cambiaste `ADMIN_PASSWORD`. Usa la clave real o `./scripts/cambiar-clave-admin.sh` |
| No aparece la foto del admin | La tabla `users` se sembró con una versión anterior del seed. Sube una imagen desde **Perfil** o reinicia la demo desde cero |
| Los PDFs no abren | Cloudinary es opcional: sin credenciales el PDF se genera al descargarlo, pero no queda publicado en `pdfUrl`. Para publicarlos, configura Cloudinary y activa "Allow delivery of PDF and ZIP files" |
| `port is already allocated` | Otro proceso usa 8080/8081/8085. Libéralo o cambia el mapeo del compose |
| `docker compose` toma otro proyecto | Ejecuta siempre desde `domain/`; el proyecto integrado se llama `pi` |

## Para seguir leyendo

- `AGENTS.md` de cada repo: arquitectura, convenciones y verificación.
- `README.md` de `domain`: seed, paginación, Cloudinary y scripts.
- `docs-tecnicos/api/domain-openapi.yaml` y `authcore-openapi.yaml`: contrato HTTP.
- `docs-tecnicos/matriz-pruebas.md`: criterio de aceptación → prueba que lo cubre.
- `docs-tecnicos/despliegue-aws.md`: despliegue en un servidor.
