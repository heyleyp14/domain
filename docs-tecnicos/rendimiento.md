# Rendimiento de las búsquedas (RNF-07)

> RNF-07: «Las búsquedas y comparaciones de productos y proveedores deben responder en pocos segundos».
> Meta propuesta (decisión D7, a confirmar por el equipo): **percentil 95 por debajo de 1 segundo con 5.000 productos**.

## Resultado

**Cumple con amplio margen:** mediana de 0,010 s y percentil 95 de 0,065 s.

| Medida (50 búsquedas, 5.000 productos) | Valor |
|---|---|
| Mediana | 0,010 s |
| Percentil 95 | 0,065 s |
| Máximo | 0,085 s |
| Respuestas con error | 0 de 50 |
| Carga de 5.000 productos (8 peticiones en paralelo) | 7 s, todas con 201 |

### Por tipo de búsqueda

| Búsqueda | Resultados | Tiempo | Tamaño de la respuesta |
|---|---|---|---|
| Código exacto (`q=PERF-02500`) | 1 | 0,008 s | < 1 KB |
| Nombre parcial (`q=martillo`) | 333 | 0,009 s | 126 KB |
| Nombre de varias palabras (`q=tornillo modelo 1`) | 75 | 0,008 s | 28 KB |
| Sin coincidencias | 0 | 0,005 s | < 1 KB |
| Solo stock bajo (`bajoStock=true`) | 750 | 0,011 s | 280 KB |
| Nombre del proveedor | 5.000 | 0,044 s | 1.874 KB |
| Solo activos, sin texto (`soloActivos=true`) | 5.000 | 0,045 s | 1.874 KB |
| Sin filtro | 5.000 | 0,045 s | 1.874 KB |

## Hallazgo: la búsqueda no tiene límite de resultados

`GET /api/productos` devuelve **todas** las coincidencias. El tiempo del servidor sigue siendo bajo, pero
con 5.000 productos una búsqueda amplia entrega **1,8 MB de JSON**. En el navegador eso se nota: es más
lento de descargar en una red lenta y de dibujar en una tabla.

Recomendaciones, de menor a mayor esfuerzo. Ninguna está aplicada, porque las dos últimas cambian código
del profesor (regla R1):

1. **Frontend (sin tocar el backend):** no buscar con el campo vacío, exigir al menos 2 caracteres en la
   búsqueda en tiempo real, y mostrar los primeros 50 resultados con la opción «ver más».
2. **Backend:** agregar parámetros opcionales `pagina` y `tamano` a la búsqueda, sin cambiar el
   comportamiento cuando no se envían.
3. **Base de datos:** solo si el catálogo real crece mucho más, agregar un índice para búsquedas por texto
   parcial (por ejemplo, `pg_trgm` sobre el nombre). Con 5.000 productos no hace falta.

## Cómo se midió

- **Entorno:** domain service `0.1.0-SNAPSHOT` con el perfil `prod`, sobre PostgreSQL 16 en Docker, en el
  equipo de desarrollo (16 núcleos, 23 GB de RAM). Cliente y servidor en la misma máquina, así que **no
  incluye la latencia de red**. En AWS free tier (1 vCPU, 1 GB) los tiempos serán mayores; repetir la
  medición allí (fase 5).
- **Aislamiento:** se usó una instancia aparte (puerto 8095, con su propia base temporal y un secreto JWT de
  prueba), para no llenar de datos de prueba la base del sistema compartido.
- **Datos:** 1 proveedor y 5.000 productos `PERF-00001` a `PERF-05000`, con 15 nombres distintos, un tercio
  sin IVA y stock entre 0 y 39 (750 quedan en stock bajo).
- **Consultas:** las 8 de la tabla anterior (sin la fila «sin filtro»), repetidas en rotación hasta
  completar 50.

Para repetirla:

```bash
cd domain
# Contra una instancia de PRUEBA vacía. Con datos existentes, el script se niega a correr salvo --forzar.
DOMAIN=http://localhost:8095 ADMIN_PASSWORD=<clave> ./scripts/rendimiento.sh
# Variables opcionales: N_PRODUCTOS (5000), N_BUSQUEDAS (50), TOKEN (en lugar de iniciar sesión).
```

El script se protege solo:
- se niega a correr si el catálogo ya tiene productos, salvo con `--forzar`;
- se detiene con un mensaje claro si el token es rechazado;
- valida que `N_PRODUCTOS` y `N_BUSQUEDAS` sean números.

**Comparación de precios (HU-11):** no se midió aparte. Consulta las compras de un solo producto, así que su
volumen es mucho menor que el de la búsqueda.
