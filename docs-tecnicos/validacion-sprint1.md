# Validación Sprint 1: suite completa y concurrencia en la numeración

**Fecha:** 06/11/2026
**Ámbito:** backend (`domain/`), sin cambios de código fuente.
**Entorno:** Java 21.0.13, Maven 3.10.0, Spring Boot 3.5.6, H2 en memoria (`MODE=PostgreSQL`), commit `b685be1`.

`JWT_SECRET_BASE64` es obligatorio para arrancar el contexto. Para esta ejecución se generó un valor efímero en la misma shell y no se escribió en el repositorio:

```bash
export JWT_SECRET_BASE64="$(openssl rand -base64 64 | tr -d '\n')"
```

## Comandos y resultados

| Comando | Pruebas | Fallas | Errores | Omitidas | Resultado |
|---|---:|---:|---:|---:|---|
| `mvn -B verify` | 202 | 0 | 0 | 0 | BUILD SUCCESS (25,190 s) |
| `mvn -B test -Dtest=FerreteriaRestTest` | 9 | 0 | 0 | 0 | BUILD SUCCESS (7,326 s) |
| `mvn -B test -Dtest=ConcurrenciaVentasTest` | 2 | 0 | 0 | 0 | BUILD SUCCESS (5,498 s) |

La suite completa incluye dominio, casos de uso, contratos (memoria y JPA), REST, concurrencia, PDF, JWT y ArchUnit. `FerreteriaRestTest` y `ConcurrenciaVentasTest` se ejecutaron además por separado para confirmar su estado de forma aislada; ambos pasan.

## Riesgo: primera factura del año con dos ventas simultáneas

### Cómo se numera hoy

En `VentaService.emitir` (`src/main/java/co/edu/unipamplona/ferreteria/application/service/VentaService.java:61-65`) la secuencia es:

1. Bloquear los productos de la venta (`productosBloqueados`, bloqueo pesimista, códigos ordenados).
2. Calcular el año con el reloj.
3. Pedir el consecutivo a `NumeracionFacturaAdapter.siguienteSecuencia(anio)`.
4. Guardar la factura y descontar el stock.

`NumeracionFacturaAdapter` (`infrastructure/adapters/out/persistence/NumeracionFacturaAdapter.java:24-27`) hace:

- `buscarPorAnioBloqueando(anio)` con `@Lock(PESSIMISTIC_WRITE)`.
- Si existe la fila del año, la incrementa.
- Si **no existe**, crea `NumeracionFacturaEntity(anio, 1L)` y la guarda.

### La ventana de carrera

Si `numeracion_factura` no tiene fila para el año en curso, el `PESSIMISTIC_WRITE` no bloquea nada: no hay fila que bloquear y, en el nivel de aislamiento por defecto, tampoco hay bloqueo de hueco. Dos ventas simultáneas de productos **distintos** (sin producto compartido que las serialice) pueden llegar ambas a la numeración, leer vacío y tratar de insertar la misma clave primaria (`anio`, con `ultimo = 1`).

Consecuencia observada en el diseño actual:

- Una transacción inserta; la otra falla por violación de clave primaria (o por timeout de bloqueo), se revierte completa y la venta responde error (HTTP 500). No se genera un número duplicado, porque `facturas.numero` también es único, pero **se pierde una venta** y se afecta la disponibilidad.
- La ventana es estrecha: primera factura de cada año más dos ventas simultáneas sin producto en común. Una vez existe la fila del año, el bloqueo pesimista serializa la numeración y el riesgo desaparece.

Detalle relevante: `NumeracionFacturaEntity` usa `@Id` primitivo `int anio`, que nunca es `null`; Spring Data lo considera una entidad existente y el `save` termina en `merge`/inserción, no en un `persist` que pudiera detectarse como nuevo.

### ¿Lo cubre `ConcurrenciaVentasTest`?

**No.** La clase tiene dos pruebas:

- `dosVentasSimultaneasDeLaUltimaUnidadSoloUnaGana` (`ConcurrenciaVentasTest.java:53`).
- `dosAnulacionesSimultaneasDevuelvenElStockUnaSolaVez` (`ConcurrenciaVentasTest.java:71`).

Ambas usan el **mismo producto**, por lo que el bloqueo pesimista del producto serializa la sección de numeración antes de llegar a ella. Además, la prueba no limpia `numeracion_factura`, no fuerza el escenario de fila ausente y no verifica números de factura ni consecutividad. Por tanto, no reproduce la carrera de la primera factura del año con productos disjuntos.

### Recomendación y costo

Para cerrar el riesgo se proponen dos caminos:

| Opción | Alcance | Costo estimado |
|---|---|---|
| **Reintento acotado en el borde de la transacción** (recomendado como siguiente cambio) | Detectar la falla de unicidad de la numeración y reintentar la venta una vez; el segundo intento ya encuentra la fila creada y continúa. Mantiene el código simple y no cambia el modelo. | 2-3 h (implementación y prueba de concurrencia específica) |
| **Mejora futura: upsert atómico por año o fila centinela** | Garantizar la creación de la fila del año de forma atómica (por ejemplo `insert ... on conflict` o una fila sembrada por año), eliminando la ventana en origen. Es la solución definitiva si la concurrencia en el cambio de año es crítica. | 4-6 h |

Como esta tarea prohíbe modificar el código fuente, el riesgo queda documentado y no corregido. La recomendación es implementar el reintento acotado en el próximo cambio y evaluar el upsert atómico si el negocio exige tolerancia estricta en el primer día del año.

## Key Learnings

1. La suite completa queda en 202 pruebas, 0 fallas, 0 errores y 0 omitidas; `FerreteriaRestTest` (9) y `ConcurrenciaVentasTest` (2) pasan también de forma aislada.
2. El bloqueo pesimista sobre una fila inexistente no protege la creación del consecutivo: la primera factura del año con ventas simultáneas de productos distintos puede perder una venta por choque de clave primaria.
3. `ConcurrenciaVentasTest` valida concurrencia de stock y anulación, no la numeración: usa el mismo producto y no limpia ni verifica `numeracion_factura`.
4. Un `@Id` primitivo nunca es `null`, así que Spring Data no detecta la entidad como nueva; conviene tenerlo presente al razonar sobre inserciones concurrentes.
5. El reintento acotado (2-3 h) es la mitigación proporcional a corto plazo; el upsert atómico por año (4-6 h) es la solución de fondo.
