# Matriz de pruebas (RNF-13)

Cada fila es un criterio de aceptación del backlog refinado (`docs/1.1_PB_Inicial_authcore_Ferreteria_Grupo1.xlsx`),
copiado **textual**, con la prueba que lo demuestra. Total: **61 criterios** · Cubierto: 53 · NO CUMPLE (D2): 3 · Parcial: 2 · Revisión manual: 2 · Interfaz pendiente: 1.

## Última ejecución (30/10/2026)

| Conjunto | Comando (desde `domain/`) | Resultado |
|---|---|---|
| Domain: unitarias, casos de uso, contrato (memoria y JPA), REST, concurrencia, PDF, JWT, ArchUnit | `mvn -B verify` | 166 pruebas, 0 fallas, 0 errores |
| Punta a punta HU-1 a HU-12 con los servicios reales | `./scripts/humo.sh` | 50 pasos OK, código 0 |
| Criterios de AuthCore que requieren mirar la base y los logs | `./scripts/verificar-authcore.sh` | 9 OK, 0 fallas, 5 brechas D2 |
| Rendimiento de búsqueda (RNF-07) | `./scripts/rendimiento.sh` | Percentil 95: 0,065 s con 5.000 productos |
| Rutas documentadas (RNF-14) | `python3 -I scripts/verificar-openapi.py` | 20 de 20 |
| Interfaz (frontend) | `cd frontend && npm test` | **Pendiente**: fase 3 en curso (T3.2 a T3.9) |

## Estados

| Estado | Significado |
|---|---|
| **Cubierto** | Una prueba automatizada falla si el criterio deja de cumplirse |
| **Parcial** | Cubierto en un servicio o en parte del criterio; la nota dice qué falta |
| **Revisión manual** | Verificado leyendo el código o la configuración; no hay prueba automatizada |
| **Interfaz pendiente** | El servidor cumple; falta la pantalla que lo muestre (fase 3) |
| **NO CUMPLE (D2)** | AuthCore no lo cumple; no se corrige porque es código del profesor (ver `pendientes-del-equipo.md`, D2). Lo detecta `verificar-authcore.sh` |

Nombres de prueba: `Clase.metodo` en `src/test/java/...`; los pasos de los scripts aparecen entre « ».
Cuando se cierre la fase 3, hay que agregar la columna de pruebas de interfaz (Vitest) a las filas que dicen «Interfaz: T3.x».

## Criterios

### HU-1 · Registrarme con username/email y password (AuthCore)

| # | Criterio (textual del backlog refinado) | Prueba que lo cubre | Estado | Nota |
|---|---|---|---|---|
| 1 | El sistema permite registrar un usuario nuevo con username/email y password. | humo.sh: «HU-1 registro»; verificar-authcore.sh: «HU-1 registro responde 201» | **Cubierto** |  |
| 2 | Si el email ya está registrado, el sistema rechaza el registro con un mensaje de error claro. | humo.sh: «HU-1 duplicado» (409) | **Cubierto** | AuthCore valida el username repetido; no distingue email, porque no hay campo email. |
| 3 | La contraseña debe tener al menos 8 caracteres, incluyendo letras y números. | verificar-authcore.sh: «HU-1 acepta una contraseña de 6 caracteres…», «…sin números» | **NO CUMPLE (D2)** | AuthCore exige 6 caracteres sin regla de letras y números. La interfaz (T3.9) aplica la regla de 8. |
| 4 | Al registrarse exitosamente, el sistema retorna código HTTP 201 y los datos básicos del usuario (sin la contraseña). | humo.sh: «HU-1 registro»; verificar-authcore.sh: «la respuesta no contiene la contraseña» | **Cubierto** |  |
| 5 | El username/email se valida en formato correcto antes de procesar el registro. | verificar-authcore.sh: «HU-1 no valida el formato del usuario o email» | **NO CUMPLE (D2)** |  |
| 6 | El usuario recién registrado queda con el rol USER por defecto. | verificar-authcore.sh: «HU-1 el usuario nuevo queda con rol USER» | **Cubierto** |  |
| 7 | La contraseña nunca se retorna en la respuesta ni se escribe en los logs del sistema. | verificar-authcore.sh: «la respuesta no contiene la contraseña», «la contraseña no aparece en los logs» | **Cubierto** |  |

### HU-2 · Iniciar sesión con mis credenciales (AuthCore)

| # | Criterio (textual del backlog refinado) | Prueba que lo cubre | Estado | Nota |
|---|---|---|---|---|
| 1 | Dado credenciales válidas, el sistema retorna un JWT y código HTTP 200. | humo.sh: «HU-2 login correcto» | **Cubierto** |  |
| 2 | Dado credenciales inválidas, el sistema retorna 401 sin revelar si falló el usuario o la contraseña. | humo.sh: «HU-2 clave errónea», «HU-2 usuario inexistente» (mismo mensaje) | **Cubierto** |  |
| 3 | El JWT retornado incluye el id del usuario y su(s) rol(es). | domain (JUnit): JwtTokenValidatorTest.tokenValido; humo.sh: «HU-6 USER GET productos» (el domain lee los roles del token real) | **Cubierto** |  |

### HU-3 · asignar un rol (ADMIN, USER, etc.) a un usuario existente (AuthCore)

| # | Criterio (textual del backlog refinado) | Prueba que lo cubre | Estado | Nota |
|---|---|---|---|---|
| 1 | Dado un usuario existente, cuando el admin le asigna un rol válido, el cambio se refleja inmediatamente. | humo.sh: «HU-3 asignar ADMIN», «HU-3 rol ADMIN visible en lista» | **Cubierto** |  |
| 2 | Si el usuario no existe, el sistema retorna error 404. | humo.sh: «HU-3 ID inexistente» | **Cubierto** |  |
| 3 | Solo un usuario con rol ADMIN puede ejecutar esta acción; cualquier otro rol recibe 403. | humo.sh: «HU-3 USER asignar rol» (403) | **Cubierto** |  |

### HU-4 · restringir el acceso a los endpoints según el rol del usuario autenticado (AuthCore)

| # | Criterio (textual del backlog refinado) | Prueba que lo cubre | Estado | Nota |
|---|---|---|---|---|
| 1 | Un endpoint restringido a ADMIN rechaza con 403 a cualquier usuario sin ese rol. | domain (JUnit): FerreteriaRestTest.usuarioNormalNoAdministra; humo.sh: «HU-6 USER POST productos», «HU-9 USER anular», «HU-10 USER compra», «HU-12 USER reporte» | **Cubierto** |  |
| 2 | Un usuario sin token válido recibe 401 al intentar acceder a un endpoint protegido. | domain (JUnit): FerreteriaRestTest.sinCredencialesEs401; humo.sh: «HU-4 sin token», «HU-4 token alterado»; verificar-authcore.sh: «HU-4 sin token responde 403 en lugar de 401» | **NO CUMPLE (D2)** | El domain service cumple (401). AuthCore responde 403 en sus rutas protegidas. |
| 3 | Los endpoints públicos (login/register) permanecen accesibles sin token. | humo.sh: «HU-1 registro», «HU-2 login correcto» (sin token) | **Cubierto** |  |

### HU-5 · que las contraseñas se almacenen encriptadas con BCrypt (AuthCore)

| # | Criterio (textual del backlog refinado) | Prueba que lo cubre | Estado | Nota |
|---|---|---|---|---|
| 1 | Ninguna contraseña se almacena en texto plano en la base de datos. | verificar-authcore.sh: «HU-5 ninguna contraseña en texto plano» | **Cubierto** |  |
| 2 | El sistema usa BCrypt (o equivalente) para generar el hash de la contraseña. | verificar-authcore.sh: «HU-5 las contraseñas se guardan con BCrypt» | **Cubierto** | Hash `$2a$10$`, 60 caracteres. |
| 3 | Dos usuarios con la misma contraseña tienen hashes distintos (salting). | verificar-authcore.sh: «HU-5 misma contraseña, hashes distintos (sal)» | **Cubierto** |  |

### HU-6 · que el JWT emitido tenga firma digital y expiración configurable (AuthCore)

| # | Criterio (textual del backlog refinado) | Prueba que lo cubre | Estado | Nota |
|---|---|---|---|---|
| 1 | El JWT incluye una fecha/hora de expiración (claim exp). | verificar-authcore.sh: «HU-6 el JWT incluye exp», «HU-6 el JWT está firmado» | **Cubierto** |  |
| 2 | Un JWT expirado es rechazado por el sistema con código 401. | domain (JUnit): JwtTokenValidatorTest.rechazaTokenVencido | **Parcial** | Probado en el domain service (401, con 30 s de tolerancia). En AuthCore un token vencido recibe 403 (ver HU-4). |
| 3 | El tiempo de expiración es configurable sin modificar el código fuente. | AuthCore (revisión): `authcore.jwt.expiration-ms` en application.yml | **Revisión manual** | Se cambia con la variable AUTHCORE_JWT_EXPIRATIONMS, sin tocar el código. |

### HU-7 · mantener separación estricta entre el dominio y la infraestructura (puertos y adaptadores) (AuthCore)

| # | Criterio (textual del backlog refinado) | Prueba que lo cubre | Estado | Nota |
|---|---|---|---|---|
| 1 | El paquete domain no importa ninguna clase de Spring ni de JPA. | domain (JUnit): ArquitecturaHexagonalTest (8 reglas); AuthCore (revisión): el paquete domain de AuthCore no importa Spring ni JPA | **Cubierto** | En el domain lo vigila ArchUnit; en AuthCore se revisó a mano (no tiene ArchUnit). |
| 2 | Cada caso de uso del Auth Core se define primero como un puerto (interfaz) antes de implementarse. | AuthCore (revisión): 4 puertos en application/ports/in (Register, Login, AssignRole, ListUsers) | **Revisión manual** |  |
| 3 | Los adaptadores de infraestructura implementan los puertos; el dominio nunca depende de ellos. | domain (JUnit): ArquitecturaHexagonalTest; AuthCore (revisión): 3 adaptadores implementan sus puertos de salida | **Cubierto** |  |

### HU-8 · Registrar productos y proveedores, y buscar productos rápidamente por código, nombre o proveedor (Domain service)

| # | Criterio (textual del backlog refinado) | Prueba que lo cubre | Estado | Nota |
|---|---|---|---|---|
| 1 | El sistema permite registrar un producto con código, nombre, cantidad, precio unitario, IVA y proveedor. | domain (JUnit): CatalogoServiceTest.registraProducto, ProductoTest.registraValido, FerreteriaRestTest.flujoCompleto; humo.sh: «HU-8 crear producto» | **Cubierto** | Interfaz: T3.3. |
| 2 | Si el código del producto ya existe, el sistema rechaza el registro con un mensaje de error claro. | domain (JUnit): CatalogoServiceTest.codigoUnico; humo.sh: «HU-8 código repetido» | **Cubierto** |  |
| 3 | El sistema permite editar y consultar los datos de un producto ya registrado. | domain (JUnit): CatalogoServiceTest.editaProducto, ProductoTest.editar, ProductoRepositoryContractTest.actualizaYConservaLaAuditoria; consulta: FerreteriaRestTest.flujoCompleto (GET /api/productos/{codigo}) | **Cubierto** | La edición no tiene prueba por HTTP; se cubre en el caso de uso y en el repositorio. Interfaz: T3.3. |
| 4 | El sistema rechaza precios negativos y cantidades iniciales negativas antes de registrar el producto. | domain (JUnit): ProductoTest.rechazaNumerosInvalidos, CatalogoServiceTest.rechazaNegativos; humo.sh: «HU-8 precio negativo» | **Cubierto** |  |
| 5 | El sistema permite registrar un proveedor con nombre, datos de contacto y productos que suministra. | domain (JUnit): CatalogoServiceTest.registraProveedor, proveedorConSusProductos; humo.sh: «HU-8 crear proveedor» | **Cubierto** |  |
| 6 | Un producto solo puede asociarse a un proveedor que exista en el sistema. | domain (JUnit): CatalogoServiceTest.proveedorExistenteYDatosObligatorios | **Cubierto** |  |
| 7 | La búsqueda por código o por nombre retorna los productos coincidentes y muestra precio unitario, IVA y stock disponible de cada uno. | domain (JUnit): CatalogoServiceTest.busca, ProductoRepositoryContractTest.listaPorNombreYFiltraPorTextoCodigoOProveedor (en memoria y JPA); humo.sh: «HU-8 búsqueda por código» | **Cubierto** | Mostrarlo en pantalla: T3.3. |
| 8 | Si no hay coincidencias, el sistema muestra un mensaje indicando que no se encontraron productos. | domain (JUnit): FerreteriaRestTest.busquedaSinResultados | **Interfaz pendiente** | El servidor responde 200 con «No se encontraron productos». Falta mostrarlo: T3.3. |
| 9 | Técnico: el código lleva 2–20 caracteres (mayúsculas, números o guion) y es único (409); nombre de 2 a 100 caracteres; precio mayor que cero con 2 decimales; IVA del 19 % (sí/no) calculado con decimales exactos para mostrar el precio final; stock entero entre 0 y 1.000.000. Si faltan varios datos, el error los lista todos (400). | domain (JUnit): ProductoTest.validaTextos, rechazaNumerosInvalidos, precioFinal; DineroEIvaTest; CatalogoServiceTest.proveedorExistenteYDatosObligatorios; FerreteriaRestTest.datosInvalidos | **Cubierto** |  |
| 10 | Técnico: el nombre del proveedor es único sin distinguir mayúsculas ni espacios repetidos (409) y debe tener teléfono o correo (400). Editar un producto o proveedor no cambia el stock: el stock solo cambia por ventas, compras y anulaciones. Un producto se puede desactivar y reactivar (conserva su historial, pero no se vende ni se compra). | domain (JUnit): CatalogoServiceTest.nombreDeProveedorUnico, proveedorSinContacto; ProveedorTest.normalizaNombre, exigeContacto; ProductoTest.editar, desactivarYActivar; CatalogoServiceTest.desactivaYActiva; FerreteriaRestTest.productoDesactivado; humo.sh: «HU-8 desactivar producto», «HU-8 reactivar producto» | **Cubierto** |  |
| 11 | Técnico: la búsqueda admite texto (código, nombre o proveedor), solo activos y solo stock bajo (5 unidades o menos, marcado en el resultado). Registrar, editar, desactivar y reactivar son solo del rol ADMIN (403 para los demás); buscar y consultar son de cualquier usuario autenticado; un producto o proveedor inexistente responde 404. | domain (JUnit): ProductoRepositoryContractTest.filtraPorActivosYStockBajo, ProductoTest.stockBajo, FerreteriaRestTest.usuarioNormalNoAdministra; humo.sh: «HU-6 USER POST productos» | **Cubierto** |  |

### HU-9 · Registrar una venta, generar la factura en formato PDF y descontar del inventario los productos vendidos (Domain service)

| # | Criterio (textual del backlog refinado) | Prueba que lo cubre | Estado | Nota |
|---|---|---|---|---|
| 1 | El sistema permite agregar varios productos con su cantidad a una venta y calcula subtotal, IVA y total. | domain (JUnit): VentaServiceTest.emiteFactura, FacturaTest.totales | **Cubierto** | Carrito en pantalla: T3.4. |
| 2 | Al confirmar la venta, el sistema genera una factura en PDF con los productos, cantidades, precios, IVA y total. | domain (JUnit): GeneradorPdfAdapterTest.laFacturaIncluyeNumeroClienteLineasYTotales; humo.sh: «HU-9 PDF factura» | **Cubierto** | Descarga en pantalla: T3.4. |
| 3 | El sistema rechaza la venta de un producto cuya cantidad solicitada supere el stock disponible. | domain (JUnit): EmisionFacturaServiceTest.informaTodosLosFaltantes, VentaServiceTest.stockInsuficienteNoDejaRastro; humo.sh: «HU-9 stock insuficiente» | **Cubierto** |  |
| 4 | Al confirmarse una venta, el stock de cada producto disminuye exactamente en la cantidad vendida. | domain (JUnit): VentaServiceTest.descuentaStock; humo.sh: «HU-9 stock decrementado» | **Cubierto** |  |
| 5 | Si la venta falla o se cancela, el stock no se modifica. | domain (JUnit): VentaServiceTest.stockInsuficienteNoDejaRastro; humo.sh: «HU-9 stock insuficiente (409, stock intacto)» | **Cubierto** |  |
| 6 | El stock actualizado puede consultarse de inmediato después de la venta. | humo.sh: «HU-9 stock decrementado» (consulta justo después de vender); domain (JUnit): FerreteriaRestTest.flujoCompleto | **Cubierto** |  |
| 7 | Técnico: la factura lleva número FAC-AAAA-NNNNNN (consecutivo por año, sin huecos si la venta se cancela), fecha, datos del cliente (nombre, dirección y teléfono) y el vendedor que la emitió. El nombre y el precio de cada producto se congelan en la línea; el IVA se calcula por línea con decimales exactos y los valores del PDF son los mismos de la factura guardada. | domain (JUnit): FacturaTest.numero, ivaPorLinea; VentaServiceTest.consecutivo, datosCongelados, emiteFactura; humo.sh: «RNF-09 total JSON (…) == total PDF (…)» | **Cubierto** |  |
| 8 | Técnico: la venta es todo o nada: factura, descuento de stock y numeración se confirman en una sola transacción y el stock nunca queda negativo. Si faltan varios productos, la respuesta (409) los lista todos con lo disponible y lo pedido. Un producto repetido en varias líneas se suma antes de validar; un producto desactivado no se vende (409). | domain (JUnit): EmisionFacturaServiceTest.consolidaRepetidos, informaTodosLosFaltantes, productoInactivo; VentaServiceTest.productoRepetido, stockInsuficienteNoDejaRastro; FerreteriaRestTest.productoDesactivado | **Cubierto** |  |
| 9 | Técnico: dos ventas simultáneas del último producto no se pueden cumplir las dos (los productos se bloquean siempre en orden de código): una gana y la otra recibe 409. | domain (JUnit): ConcurrenciaVentasTest.dosVentasSimultaneasDeLaUltimaUnidadSoloUnaGana; ProductoRepositoryContractTest.bloqueaSoloLosQueExistenOrdenadosPorCodigo | **Cubierto** |  |
| 10 | Técnico: vender y consultar la factura (y descargar su PDF) son de cualquier usuario autenticado. El ADMIN puede anular una factura con un motivo: devuelve el stock a cada producto y deja la factura ANULADA con quién y cuándo (409 si ya estaba anulada; 403 para los demás roles). | domain (JUnit): FacturaTest.anular, VentaServiceTest.adminVende, ConcurrenciaVentasTest.dosAnulacionesSimultaneasDevuelvenElStockUnaSolaVez; humo.sh: «HU-9 anular factura», «stock restaurado», «anular doble», «USER anular» | **Cubierto** |  |

### HU-10 · Registrar las compras realizadas a los proveedores (Domain service)

| # | Criterio (textual del backlog refinado) | Prueba que lo cubre | Estado | Nota |
|---|---|---|---|---|
| 1 | El sistema permite registrar una compra indicando proveedor, productos, cantidades y precio de compra. | domain (JUnit): CompraServiceTest.guardaDatos; humo.sh: «HU-10 compra registrada» | **Cubierto** | Interfaz: T3.6. |
| 2 | Al confirmar la compra, el stock de cada producto aumenta en la cantidad adquirida. | domain (JUnit): CompraServiceTest.aumentaStock, ProductoTest.reponer; humo.sh: «HU-10 stock incrementado» | **Cubierto** |  |
| 3 | El sistema guarda la fecha y el proveedor de cada compra para su consulta posterior. | domain (JUnit): CompraServiceTest.guardaDatos, consulta; CompraRepositoryContractTest.guardaYRecuperaConSusLineas | **Cubierto** |  |
| 4 | Técnico: la compra es todo o nada (compra y aumentos de stock en una sola transacción). La fecha es opcional (hoy por defecto) y no puede ser futura; un producto no se repite en la misma compra; cantidad entre 1 y 100.000 y precio de compra mayor que cero (400). Código de compra CMP-NNNNNN. | domain (JUnit): CompraServiceTest.todoONada, fechas; CompraTest.validaReglas, lineaValida, codigo; humo.sh: «HU-10 fecha futura» | **Cubierto** |  |
| 5 | Técnico: el proveedor y los productos deben existir (404) y los productos estar activos (409). Registrar y consultar compras (por código o con filtros de proveedor, rango de fechas y producto) son solo del rol ADMIN (403 para los demás). | domain (JUnit): CompraServiceTest.validaProveedorYProductos, permisos, listaYFiltra; CompraRepositoryContractTest.buscaConFiltrosYOrdenaDeLaMasRecienteALaMasAntigua; humo.sh: «HU-10 USER compra» | **Cubierto** |  |

### HU-11 · Comparar los precios de un mismo producto entre distintos proveedores (Domain service)

| # | Criterio (textual del backlog refinado) | Prueba que lo cubre | Estado | Nota |
|---|---|---|---|---|
| 1 | Al consultar un producto, el sistema muestra los precios de compra registrados por cada proveedor. | domain (JUnit): ComparacionPreciosServiceTest.comparaProveedores, soloEseProducto; humo.sh: «HU-11 comparación con dos proveedores» | **Cubierto** | Interfaz: T3.7. |
| 2 | El sistema indica cuál proveedor ofreció el menor precio. | domain (JUnit): ComparacionPreciosServiceTest.comparaProveedores, ComparadorPreciosTest.empate; humo.sh: «menor marcado» | **Cubierto** |  |
| 3 | La comparación se obtiene en segundos, sin revisar cuadernos ni facturas físicas. | rendimiento.sh; docs-tecnicos/rendimiento.md | **Parcial** | Medida para la búsqueda de productos (percentil 95: 0,065 s). La comparación no se midió aparte: consulta las compras de un solo producto. |
| 4 | Técnico: de cada proveedor se compara su precio más reciente (el vigente) y se muestra además su menor precio histórico, la fecha de su última compra y cuántas compras tiene. Orden: menor precio vigente primero; si hay empate se marcan todos como menor. | domain (JUnit): ComparacionPreciosServiceTest.precioVigente; ComparadorPreciosTest.comparaElPrecioVigente, desempateMismaFecha, empate | **Cubierto** |  |
| 5 | Técnico: la comparación es solo del rol ADMIN (403 para los demás). Un producto inexistente responde 404; un producto sin compras responde 200 con un mensaje claro, no un error. | domain (JUnit): ComparacionPreciosServiceTest.validaciones, sinCompras; humo.sh: «HU-11 producto sin compras», «HU-11 producto inexistente» | **Cubierto** |  |

### HU-12 · Generar un reporte diario de ventas en formato PDF (Domain service)

| # | Criterio (textual del backlog refinado) | Prueba que lo cubre | Estado | Nota |
|---|---|---|---|---|
| 1 | El sistema genera un reporte con todas las ventas de la fecha seleccionada, con productos, cantidades y totales. | domain (JUnit): ReporteVentasServiceTest.reporteDelDia, ReporteDiarioServiceTest.agrupaYOrdena; humo.sh: «HU-12 reporte diario» | **Cubierto** | Interfaz: T3.8. |
| 2 | El reporte incluye el total vendido del día y puede descargarse en formato PDF. | domain (JUnit): GeneradorPdfAdapterTest.elReporteDiarioIncluyeTotalesYFacturasAnuladas, ReporteVentasServiceTest.pdf; humo.sh: «HU-12 PDF reporte» | **Cubierto** |  |
| 3 | Si no hubo ventas en la fecha seleccionada, el sistema lo indica en el reporte. | domain (JUnit): ReporteVentasServiceTest.sinVentas, ReporteDiarioServiceTest.sinVentas, GeneradorPdfAdapterTest.elReporteDiarioSinVentasLoDiceExplicitamente | **Cubierto** |  |
| 4 | Técnico: el día se calcula en la zona horaria America/Bogota (no en UTC). Las facturas anuladas no suman al total, pero el reporte indica cuántas hubo y las marca en el listado. Cada producto muestra unidades, subtotal, IVA y total; el reporte también lista cada factura con su cliente y vendedor. | domain (JUnit): ReporteVentasServiceTest.diaEnZonaDeBogota, ignoraAnuladas; ReporteDiarioServiceTest.ignoraAnuladas, todasAnuladas, agrupaYOrdena | **Cubierto** |  |
| 5 | Técnico: el reporte (en pantalla y en PDF) es solo del rol ADMIN (403 para los demás). La fecha se escribe AAAA-MM-DD; si falta o es inválida responde 400. Un día sin ventas devuelve un reporte vacío con mensaje, no un error. | domain (JUnit): ReporteVentasServiceTest.validaciones, sinVentas; humo.sh: «HU-12 fecha inválida», «HU-12 USER reporte» | **Cubierto** |  |
