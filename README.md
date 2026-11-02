# Domain Service - Ferretería Ambiente Murano 3D

Servicio de dominio (Spring Boot 3.5.6, Java 17) para la ferretería.

## Requisitos
- Java 21 (compila con `--release 17`)
- Maven 3.9+
- PostgreSQL 16 (perfil prod) / H2 (dev y test)

## Desarrollo local

```bash
cd domain
JWT_SECRET_BASE64=<valor> mvn -B verify
```

Para perfil `prod` con PostgreSQL en Docker:

```bash
cd domain
docker compose up -d domain-db
JWT_SECRET_BASE64=<valor> mvn -B spring-boot:run -Dspring-boot.run.profiles=prod
```

## Desarrollo con recarga (sin `--build` en cada cambio)

Todo corre en Docker. Las imágenes de desarrollo solo aportan el toolchain (`maven`, `gradle`,
`node`); el código entra por bind mount, así que los cambios se recompilan y recargan solos.

Primera vez (construye las imágenes de desarrollo):

```bash
cd domain
docker compose -f docker-compose.yml -f docker-compose.dev.yml build
```

Después, solo levantar:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d
```

- Frontend: http://localhost:8080 (Vite con HMR; publica el 5173 interno en el 8080 de siempre).
- AuthCore: http://localhost:8081 (`gradle -t classes` + Spring Boot DevTools).
- Domain: http://localhost:8085 (`mvn compile` al detectar cambios + DevTools).
- MySQL y PostgreSQL quedan en la red interna del compose.

Editar un `.java`, `.tsx` o `.css` no requiere reconstruir nada. Logs:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml logs -f authcore domain frontend
```

La primera ejecución descarga dependencias (Maven, Gradle, npm); luego quedan en volúmenes. El
compose de producción (`docker-compose.yml` solo, o con `docker-compose.prod.yml`) no cambia.

## Cloudinary (imágenes y PDFs)

`CLOUDINARY_URL` llega por variable de entorno con el formato
`cloudinary://<api_key>:<api_secret>@<cloud_name>`. Se usa en dos puntos:

- AuthCore: imagen de perfil del usuario (`POST /api/auth/me/image`).
- Domain: publicar el PDF de cada factura al emitirla. La URL se guarda en `pdfUrl` de la factura
  y el PDF se regenera y vuelve a publicar al anularla.

Alternativa sin secret: `CLOUDINARY_CLOUD_NAME` + `CLOUDINARY_UPLOAD_PRESET` (preset unsigned).
Útil si la API key no tiene permiso de subida; el PDF se publica igual y se guarda su `secure_url`.
Un preset unsigned no admite `overwrite`, así que cada publicación genera un `public_id` nuevo.

Si no hay credencial ni preset, el servicio arranca igual: la factura se emite sin `pdfUrl` y la
publicación se reintenta al descargar el PDF. Nunca escribas el secret en `application.yml` ni en el
repo.
En Cloudinary debe estar activo **Settings → Security → Allow delivery of PDF and ZIP files** para
poder abrir la URL del PDF.

La factura se dibuja con una plantilla Thymeleaf (`src/main/resources/templates/factura.html`)
renderizada a PDF con openhtmltopdf; los datos y totales vienen del dominio. El diseño usa el logo
de la ferretería (`src/main/resources/images/logo.jpg`) y las fuentes Lato + IBM Plex Mono
(`src/main/resources/fonts`, licencia OFL), e imprime el total en letras. El reporte diario
(`reporte-diario.html`) comparte la misma identidad visual y paginación.

## Seed de desarrollo

`POST /api/seed` (ADMIN) reinicia la base y crea 20 proveedores, 20 productos, 20 compras y 20
facturas con **las fechas del día en que se ejecuta** (hora de Bogotá). No hay tareas automáticas: el
seed se ejecuta a mano cuando se quiere una demo completa, y cada ejecución deja los datos "de hoy".

- 6 productos quedan en stock bajo (0, 0, 1, 2, 3 y 5) para llenar "Stock bajo".
- 7 facturas son de hoy (una anulada) y llenan "Ventas de hoy", "Más vendidos hoy" y el reporte diario.
- Las otras 13 se reparten entre hace 1 y 25 días, así la gráfica y "Facturas" tienen historia.
- Las compras van de hace 40 a hace 21 días, para que "Comparar precios" muestre el precio vigente.

Cada factura usa la plantilla nueva y, si Cloudinary está configurado, genera y publica su PDF en
`pdfUrl`; sin Cloudinary el seed funciona igual y deja `pdfUrl` nulo. La ejecución tarda unos 20–25 s
por las 20 subidas.

Para ejecutarlo sin armar el `curl`: `./scripts/seed.sh` (lee `ADMIN_PASSWORD` de `.env`, inicia sesión
como admin y llama al endpoint).

## Paginación

Las listas de la API aceptan `pagina` (1-based, por defecto 1) y `tamano` (por defecto 20, máximo 100).
Devuelven `{ total, pagina, tamano, totalPaginas, ... }`; una página fuera de rango llega vacía con el
total real. El frontend guarda la página y los filtros en la URL (`usePaginaUrl`), así que recargar o
compartir el enlace conserva la vista.

## Pruebas

```bash
cd domain
mvn -B verify          # todas las pruebas (166 tests)
mvn -B test            # solo pruebas unitarias/integración
```

## Sistema completo (con AuthCore y Frontend)

Requiere tener `authcore/` clonado junto a `domain/`:

```bash
cd domain
docker compose up -d --build
```

Servicios:
- `authcore-db` (MySQL 8.4)
- `authcore` (Spring Boot 4.1.1) - puerto 8081
- `domain-db` (PostgreSQL 16)
- `domain` (Spring Boot 3.5.6) - puerto 8085
- `frontend` (nginx) - puerto 8080

## Scripts de apoyo (en `scripts/`)

- `generar-env.sh` - Genera `.env` con secretos aleatorios
- `verificar-secreto.sh` - Verifica consistencia JWT_SECRET/JWT_SECRET_BASE64
- `seed.sh` - Seed de demostración con las fechas del día (reinicia la base)
- `humo.sh` - Prueba de humo E2E (HU-1 a HU-12 + RNF-09)
  - Uso: `./scripts/humo.sh` (solo salida en consola)
  - Uso: `./scripts/humo.sh --evidencia` (guarda archivo NUEVO en `scripts/evidencia/humo-AAAA-MM-DD_HHMMSS.txt`)

```bash
cd domain
./scripts/generar-env.sh
./scripts/verificar-secreto.sh
docker compose up -d --build
./scripts/seed.sh          # datos de demo con las fechas de hoy
./scripts/humo.sh          # solo consola
./scripts/humo.sh --evidencia  # genera archivo de evidencia
```

## Calidad y operación (fase 4)

| Script o documento | Para qué |
|---|---|
| `scripts/verificar-authcore.sh` | Criterios de AuthCore que exigen mirar su base y sus logs (BCrypt, sal, contraseña fuera de los logs). Informa las brechas D2 sin fallar |
| `scripts/seed.sh` | Seed de demostración con las fechas del día: 20 por entidad, ventas de hoy, stock bajo e historia reciente. Reinicia la base |
| `scripts/respaldo.sh` / `scripts/restaurar.sh` | Respaldo y restauración de las dos bases (RNF-12). Ver `docs-tecnicos/plan-respaldo.md` |
| `scripts/rendimiento.sh` | Mide la búsqueda con 5.000 productos (RNF-07). **Solo contra una instancia de prueba**. Ver `docs-tecnicos/rendimiento.md` |
| `scripts/verificar-openapi.py` | Comprueba que las rutas de los controladores y de la especificación OpenAPI coinciden |
| `docs-tecnicos/api/` | Especificación OpenAPI del domain service y de AuthCore (RNF-14) |
| `docs-tecnicos/matriz-pruebas.md` | Cada criterio de aceptación y la prueba que lo cubre (RNF-13) |

## Producción (fase 5)

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
./scripts/cambiar-clave-admin.sh      # OBLIGATORIO: reemplaza la clave fija del admin de AuthCore
```

`docker-compose.prod.yml` publica solo el puerto 80 (frontend con proxy), reinicia los servicios
automáticamente, limita la memoria (unos 710 MB en total) y rota los logs. La guía paso a paso para
AWS está en `docs-tecnicos/despliegue-aws.md`.

## Estructura
- `src/main/java/...` - Código fuente (arquitectura hexagonal)
- `src/test/` - Pruebas (dominio, aplicación, contrato JPA, REST, concurrencia)
- `pom.xml` - Configuración Maven
- `docker-compose.yml` - Orquestación completa (name: pi)
- `Dockerfile` - Multi-etapa Maven → JRE 17
- `docker/authcore.Dockerfile` - Dockerfile de AuthCore (Gradle 9.7.1 → JRE 21)