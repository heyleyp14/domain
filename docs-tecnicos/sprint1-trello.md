# Sprint 1 · Tablero de trabajo — HU-8 a HU-12

Documento base para crear las tarjetas en Trello. Se deriva de `docs/Acta_Planeacion_Sprint1_Ejemplo.docx` y de `docs/Guia_Domain_Service_Ferreteria.pdf`. El estado se contrastó con la última corrida registrada en `domain/target/surefire-reports`: **220 pruebas, 0 fallos, 0 errores y 0 omitidas** (2026-11-06 17:33). No se inventan integrantes, enlaces ni fechas.

## Cómo leer el tablero

- **Por hacer:** sin trabajo iniciado.
- **En progreso:** en desarrollo.
- **Por validar:** implementado, pendiente de corrida o de firma.
- **Hecho:** la suite automatizada que cubre la tarjeta está en verde en esta copia.
- **Etiqueta verde:** dominio y aplicación listos; en esta corrida también la infraestructura quedó validada.
- **Etiqueta roja:** falta implementar o validar la tarjeta.
- **Responsable y fecha:** `[completar]` en todas las tarjetas.

> La corrida es evidencia puntual de esta copia, no una validación en la máquina de cada integrante. Cada persona debe reproducirla con `JWT_SECRET_BASE64`.

## Resumen

| Tarjeta | Columna sugerida | Etiqueta |
|---|---|---|
| HU-8 · Productos y proveedores | Hecho | verde |
| HU-9 · Venta con factura PDF | Hecho | verde |
| HU-10 · Registrar compras | Hecho | verde |
| HU-11 · Comparación de precios | Hecho | verde |
| HU-12 · Reporte diario de ventas | Hecho | verde |
| Ejecutar `mvn verify` en local | Hecho | verde |
| `FerreteriaRestTest` | Hecho | verde |
| `ConcurrenciaVentasTest` | Hecho | verde |
| Ejercicio propio del grupo · Unidad de medida | Por validar | verde |
| Riesgo · Primer número de factura del año | Por validar | verde |

---

## HU-8 · Productos y proveedores

**Qué permite:** Registrar, editar y buscar productos y proveedores (código único, IVA, stock bajo, desactivar).

**Dónde vive la regla:** `Producto`, `Proveedor` + `CatalogoService`.

**Checklist**
- [x] Reglas de `Producto` y `Proveedor` cubiertas por `ProductoTest` (10) y `ProveedorTest` (5).
- [x] Casos de uso de catálogo cubiertos por `CatalogoServiceTest` (15).
- [x] Contratos de repositorio en memoria y JPA: `ProductoRepository*` (14) y `ProveedorRepository*` (14).
- [x] Flujo HTTP y permisos cubiertos por `FerreteriaRestTest` (9).
- [x] `mvn verify` sin fallos: 220 pruebas.

**Columna sugerida:** Hecho

**Etiqueta:** verde

**Responsable:** [completar]

**Fecha:** [completar]

---

## HU-9 · Venta con factura PDF

**Qué permite:** Vender con varios productos, factura en PDF, descuento de stock todo o nada y anulación.

**Dónde vive la regla:** `Factura` + `EmisionFacturaService` + `VentaService`.

**Checklist**
- [x] Venta con varias líneas, totales y descuento de stock: `VentaServiceTest` (19) y `FacturaTest` (7).
- [x] Emisión todo o nada y congelamiento de nombre y precio: `EmisionFacturaServiceTest` (6).
- [x] Factura en PDF con totales: `GeneradorPdfAdapterTest` (9).
- [x] Anulación y concurrencia: `ConcurrenciaVentasTest` (2) y `FerreteriaRestTest.flujoCompleto`.
- [x] Rutas protegidas: `FerreteriaRestTest` cubre 401 y 403.

**Columna sugerida:** Hecho

**Etiqueta:** verde

**Responsable:** [completar]

**Fecha:** [completar]

---

## HU-10 · Registrar compras

**Qué permite:** Registrar compras a proveedores; al confirmarlas sube el stock.

**Dónde vive la regla:** `Compra` + `CompraService`.

**Checklist**
- [x] Registro y confirmación de compra con subida de stock: `CompraServiceTest` (8) y `CompraTest` (4).
- [x] Contratos de repositorio en memoria y JPA: `CompraRepository*` (8).
- [x] Flujo HTTP de compra: `FerreteriaRestTest.flujoCompleto`.

**Columna sugerida:** Hecho

**Etiqueta:** verde

**Responsable:** [completar]

**Fecha:** [completar]

---

## HU-11 · Comparación de precios

**Qué permite:** Comparar el precio de un producto entre proveedores e indicar el menor.

**Dónde vive la regla:** `ComparadorPrecios`.

**Checklist**
- [x] Comparación con último precio por proveedor y mínimo histórico: `ComparacionPreciosServiceTest` (5) y `ComparadorPreciosTest` (5).
- [x] Flujo HTTP de comparación: `FerreteriaRestTest.flujoCompleto`.

**Columna sugerida:** Hecho

**Etiqueta:** verde

**Responsable:** [completar]

**Fecha:** [completar]

---

## HU-12 · Reporte diario de ventas

**Qué permite:** Reporte diario de ventas, en pantalla y en PDF.

**Dónde vive la regla:** `ReporteDiarioService`.

**Checklist**
- [x] Reporte diario en pantalla: `ReporteVentasServiceTest` (9) y `ReporteDiarioServiceTest` (5).
- [x] Reporte en PDF: `GeneradorPdfAdapterTest` (9).
- [x] Tendencia por día: `TendenciaVentasServiceTest` (5) y `FerreteriaRestTest.tendenciaDeVentas`.
- [x] Flujo HTTP y permisos: `FerreteriaRestTest`.

**Columna sugerida:** Hecho

**Etiqueta:** verde

**Responsable:** [completar]

**Fecha:** [completar]

---

## Ejecutar `mvn verify` en local

**Qué permite:** Compilar y ejecutar toda la suite local: dominio, aplicación, contratos, REST, concurrencia, PDF, JWT y arquitectura.

**Dónde vive la regla:** No es una regla de negocio: la verificación vive en `pom.xml` y en `src/test/`; el resultado se escribe en `target/surefire-reports/`.

**Checklist**
- [x] Corrida completa: 220 pruebas, 0 fallos, 0 errores, 0 omitidas (2026-11-06 17:33).
- [x] Arquitectura hexagonal: `ArquitecturaHexagonalTest` (8).
- [x] Contratos en memoria y JPA: 23 + 23 pruebas.
- [x] Seguridad e integración HTTP: `FerreteriaRestTest` (9).
- [x] Concurrencia: `ConcurrenciaVentasTest` (2).
- [x] Sin cambios en `src/` ni en `pom.xml` posteriores a la corrida.

**Columna sugerida:** Hecho

**Etiqueta:** verde

**Responsable:** [completar]

**Fecha:** [completar]

---

## `FerreteriaRestTest`

**Qué permite:** Validar por HTTP real, con JWT, los 401, 403 y 400, el flujo completo de las cinco historias y los bordes de consulta.

**Dónde vive la regla:** `src/test/java/co/edu/unipamplona/ferreteria/infrastructure/adapters/in/rest/FerreteriaRestTest.java`.

**Checklist**
- [x] Sin token o con token falso: 401 (`sinCredencialesEs401`).
- [x] Un USER consulta y vende, pero no administra el catálogo, ni compra, ni ve reportes: 403 (`usuarioNormalNoAdministra`).
- [x] Datos faltantes o inválidos: 400 con el mensaje del dominio (`datosInvalidos`).
- [x] Flujo completo de las cinco historias (`flujoCompleto`).
- [x] Tendencia de ventas, búsqueda sin resultados, paginación y producto desactivado.
- [x] Seed de datos de inicio (`seedRellenaElInicio`).

**Columna sugerida:** Hecho

**Etiqueta:** verde

**Responsable:** [completar]

**Fecha:** [completar]

---

## `ConcurrenciaVentasTest`

**Qué permite:** Comprobar que dos ventas simultáneas de la última unidad no se cumplen ambas y que dos anulaciones simultáneas devuelven el stock una sola vez.

**Dónde vive la regla:** `src/test/java/co/edu/unipamplona/ferreteria/infrastructure/adapters/out/persistence/ConcurrenciaVentasTest.java`.

**Checklist**
- [x] `dosVentasSimultaneasDeLaUltimaUnidadSoloUnaGana`.
- [x] `dosAnulacionesSimultaneasDevuelvenElStockUnaSolaVez`.
- [x] Corre con H2 dentro de `mvn verify`, sin fallos.

**Nota:** el conflicto de dos ventas pidiendo el primer número de factura del año sigue siendo una limitación conocida. Automatizar el reintento es una mejora futura, no un fallo de esta prueba.

**Columna sugerida:** Hecho

**Etiqueta:** verde

**Responsable:** [completar]

**Fecha:** [completar]

---

## Ejercicio propio del grupo · Unidad de medida en Producto

**Qué permite:** Registrar y editar cada producto con su unidad de medida (por defecto `UNIDAD`), obligatoria y validada, sin romper los productos existentes.

**Dónde vive la regla:** `domain/model/UnidadMedida.java` y `domain/model/Producto.java`; se expone en el comando, el DTO REST, la entidad JPA y el mapper. Ejemplos en `requests.http` y `README.md`.

**Checklist**
- [x] Elegir la extensión (unidad de medida) y dejar constancia.
- [x] Escribir las pruebas (`ProductoTest`, `CatalogoServiceTest`, contratos de repositorio, `FerreteriaRestTest`).
- [x] Implementar en dominio, aplicación e infraestructura.
- [x] `mvn verify` en verde (220 pruebas, 0 fallas, 06/11/2026).
- [x] Actualizar `README.md` y `requests.http`.
- [ ] Actualizar `docs-tecnicos/matriz-pruebas.md`.

**Columna sugerida:** Por validar (falta actualizar la matriz de pruebas y validar en la máquina de cada integrante)

**Etiqueta:** verde

**Responsable:** [completar]

**Fecha:** [completar]

---

## Riesgo · Primer número de factura del año con ventas simultáneas

**Qué permite:** Dejar registrada y resuelta la decisión sobre la carrera al crear la fila de numeración del año (dos ventas de productos distintos pueden chocar por clave primaria y se pierde una venta).

**Dónde vive la regla:** `VentaService.emitir` y `NumeracionFacturaAdapter.siguienteSecuencia`. Análisis en `docs-tecnicos/validacion-sprint1.md`.

**Checklist**
- [x] Ejecutar `ConcurrenciaVentasTest` y documentar que no cubre este caso.
- [x] Decidir: se deja como mejora futura (06/11/2026).
- [x] Decisión registrada en `validacion-sprint1.md`.
- [ ] Registrar la decisión en el acta del grupo.
- [ ] (Futuro) Prueba que reproduzca el caso (productos distintos, sin fila del año) y luego el reintento acotado.

**Columna sugerida:** Por validar (falta copiar la decisión al acta)

**Etiqueta:** verde

**Responsable:** [completar]

**Fecha:** [completar]

---

## Key Learnings

- Estado verificado el 06/11/2026: `mvn verify` con 220 pruebas, 0 fallas, 0 errores y 0 omitidas (reportes de `target/surefire-reports`).
- HU-8 a HU-12, `FerreteriaRestTest` y `ConcurrenciaVentasTest` pasan a Hecho; las suites que la guía marcaba como "por correr" ya están en verde.
- El ejercicio propio (unidad de medida en Producto) está implementado y probado; queda por validar en cada máquina y actualizar `matriz-pruebas.md`.
- El riesgo del primer número de factura del año es una limitación conocida: `ConcurrenciaVentasTest` no lo cubre (usa el mismo producto). Decisión: se deja como mejora futura.
- No se registran responsables, fechas ni enlaces: se dejan como `[completar]` para que el equipo los complete con datos reales.
- La validación manual por integrante (token ADMIN, al menos tres operaciones USER y descarga de PDF) no está evidenciada aquí; queda pendiente aunque la automatización esté en verde.
