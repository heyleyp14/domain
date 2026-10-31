# Domain Service · Ferretería Ambiente Murano 3D (Grupo 1)

Servicio de dominio de ventas, inventario y compras (HU-8 a HU-12) sobre arquitectura hexagonal. Valida el JWT que emite
**AuthCore** (firma compartida, HS384). Material del Proyecto Integrador.

## Estado (leer primero)

| Capa | Estado |
|---|---|
| `domain` + `application` (Java puro) | Compiladas con `javac`; **118 pruebas ejecutadas, todas en verde** |
| Generador de PDF (`adapters/out/pdf`) | Compilado y ejecutado: **7 pruebas más en verde** (total verificado: **125**). El PDF se revisó visualmente |
| Contrato de los repositorios | Las mismas pruebas pasan sobre el doble en memoria (verificado) y sobre el adaptador JPA (**escrito, no ejecutado**) |
| `infrastructure` con Spring (JPA, JWT, REST, seguridad) | **Escrita pero NO compilada ni ejecutada**: el entorno donde se generó no podía descargar dependencias de Maven. Lo primero es correr `mvn verify` |
| Pruebas con Spring (REST, JPA, ArchUnit, JWT, concurrencia) | Escritas, **no ejecutadas** |

Si `mvn verify` muestra algún error de compilación o de prueba en infraestructura, es de esperar y se corrige rápido; el
núcleo no depende de ella. Dos consultas de JPQL merecen una mirada atenta la primera vez: la búsqueda de compras
(`CompraJpaRepository.buscar`) y la de líneas por producto.

## Cómo se ve cada tema en el código

| Bloque | Tema | Dónde está |
|---|---|---|
| SOLID | **S**RP | Un servicio por tema (`CatalogoService`, `VentaService`, `CompraService`, `ComparacionPreciosService`, `ReporteVentasService`); `JwtTokenValidator` valida y `JwtAuthenticationFilter` solo extrae el token |
| SOLID | **O**CP | Una regla nueva (otro impuesto, otro reporte) es una clase nueva; `GeneradorPdfPort` permite cambiar el PDF sin tocar la venta |
| SOLID | **L**SP | `contract/*RepositoryContractTest`: las mismas pruebas las pasan el doble en memoria y el adaptador JPA |
| SOLID | **I**SP | Casos de uso pequeños en `application/port/in` (`VentaUseCase`, `CompraUseCase`…) |
| SOLID | **D**IP | `application` solo conoce puertos (`port/out`), incluidos `TransaccionPort` y el reloj inyectado; `BeanConfig` conecta todo en el borde. ArchUnit lo vigila |
| Dominio | Núcleo | Objetos de valor (`Dinero`, `Iva`, `NumeroFactura`), entidades (`Producto`, `Proveedor`), agregados `Factura` y `Compra`, servicios de dominio (`EmisionFacturaService`, `ComparadorPrecios`, `ReporteDiarioService`, `PoliticaAcceso`) |
| Patrones | Factory | `registrar()`, `emitir()`, `reconstruir()`, `Dinero.de()`, `NumeroFactura.de()` |
| Patrones | Adapter / Mapper | `infrastructure/adapters/out/persistence/mapper` (dominio ↔ entidad JPA) |
| Patrones | Repository | Puertos `*RepositoryPort` + `*RepositoryAdapter` |

```
domain/          Java puro: model, service, exception
application/     port/in (casos de uso + comandos), port/out (repositorios, numeración, transacción, PDF), service
infrastructure/  config (composición), security (JWT), adapters/in/rest, adapters/out/persistence, adapters/out/pdf
```

## Endpoints

Todos exigen `Authorization: Bearer <JWT de AuthCore>`. Roles: **ADMIN** y **USER** (el vendedor es un USER).

| HU | Método y ruta | Rol |
|---|---|---|
| 8 | `POST /api/proveedores` · `PUT /api/proveedores/{id}` | ADMIN |
| 8 | `GET /api/proveedores?q=` · `GET /api/proveedores/{id}` (incluye sus productos) | autenticado |
| 8 | `POST /api/productos` · `PUT /api/productos/{codigo}` · `POST /api/productos/{codigo}/desactivar` · `…/activar` | ADMIN |
| 8 | `GET /api/productos?q=&soloActivos=&bajoStock=` · `GET /api/productos/{codigo}` | autenticado |
| 9 | `POST /api/facturas` (valida y descuenta stock; todo o nada) · `GET /api/facturas/{numero}` | autenticado |
| 9 | `GET /api/facturas/{numero}/pdf` | autenticado |
| 9 | `POST /api/facturas/{numero}/anulacion` con `{motivo}` (devuelve el stock) | ADMIN |
| 10 | `POST /api/compras` · `GET /api/compras?proveedorId=&desde=&hasta=&producto=` · `GET /api/compras/{codigo}` | ADMIN |
| 11 | `GET /api/productos/{codigo}/comparacion-precios` | ADMIN |
| 12 | `GET /api/reportes/ventas-diarias?fecha=AAAA-MM-DD` · `…/pdf` | ADMIN |

Errores: 400 dato inválido o faltante · 401 sin token · 403 sin permiso · 404 no existe · 409 duplicado, sin stock
(con el detalle de cada producto que falta), ya anulada o conflicto de concurrencia. Hay ejemplos listos en `requests.http`.

## Ejecutar

```bash
export JWT_SECRET_BASE64='<la misma clave Base64 que usa AuthCore>'   # sin esto la app no arranca, a propósito
mvn verify                      # compila y corre todas las pruebas
mvn spring-boot:run             # puerto 8085, H2 en memoria
# producción: SPRING_PROFILES_ACTIVE=prod DB_URL=... DB_USER=... DB_PASSWORD=...
```

La clave debe tener al menos 48 bytes para HS384. La clave nunca va en el repositorio. Las pruebas con Spring usan una
clave propia **solo de pruebas** (`FerreteriaRestTest.SECRETO_DE_PRUEBA`). Los datos que se imprimen en la factura
(nombre del negocio, NIT, dirección, teléfono) salen de `ferreteria.negocio.*` y se cambian con variables de entorno.

## Supuestos de negocio (confirmar con el grupo)

1. Número de factura `FAC-AAAA-NNNNNN`, consecutivo por año, sin huecos si la venta se cancela (el número se revierte con la transacción).
2. IVA 19 % calculado **por línea** (redondeo a 2 decimales, mitad hacia arriba) solo en los productos que lo aplican. Dinero en pesos colombianos con `BigDecimal`.
3. Nombre y precio se **congelan** en la línea al facturar; cambiar el producto después no altera facturas ya emitidas.
4. La venta es todo o nada: factura, descuento de stock y numeración van en una sola transacción. Si faltan varios productos, la respuesta los lista todos.
5. Para que dos ventas a la vez no vendan la misma unidad, los productos se bloquean (`SELECT … FOR UPDATE`) siempre en orden de código.
6. Un producto desactivado no se vende ni se compra, pero conserva su historial. Editar un producto **no** cambia su stock: el stock solo cambia por ventas, compras y anulaciones.
7. «Stock bajo» = 5 unidades o menos.
8. Anular (solo ADMIN) exige un motivo, devuelve el stock y no se puede repetir.
9. Una compra no puede tener fecha futura ni repetir un producto; al registrarla sube el stock.
10. La comparación de precios usa el **último** precio que cobró cada proveedor (el vigente) y muestra además su menor precio histórico. Si hay empate en el menor, se marcan todos.
11. El reporte diario usa el día de `America/Bogota` (no el de UTC), no suma facturas anuladas y dice explícitamente cuando no hubo ventas.
12. Roles: catálogo, compras, anulación y reportes solo ADMIN; vender y consultar, cualquier usuario autenticado. Es una decisión de diseño, no viene en el informe del grupo.

## Pendiente

Migraciones Flyway (hoy `ddl-auto: update`), paginación en listados, reintento automático ante conflicto de concurrencia
(incluido el caso de dos ventas que piden el primer número del año exactamente a la vez), registro de cambios de precio
y mapear los roles exactos que emite AuthCore.
