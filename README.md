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
- `humo.sh` - Prueba de humo E2E (HU-1 a HU-12 + RNF-09)

```bash
cd domain
./scripts/generar-env.sh
./scripts/verificar-secreto.sh
docker compose up -d --build
./scripts/humo.sh
```

## Estructura
- `src/main/java/...` - Código fuente (arquitectura hexagonal)
- `src/test/` - Pruebas (dominio, aplicación, contrato JPA, REST, concurrencia)
- `pom.xml` - Configuración Maven
- `docker-compose.yml` - Orquestación completa (name: pi)
- `Dockerfile` - Multi-etapa Maven → JRE 17
- `docker/authcore.Dockerfile` - Dockerfile de AuthCore (Gradle 9.7.1 → JRE 21)