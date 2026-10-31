# Plan de respaldo (RNF-12)

> RNF-12: «Debe realizarse una copia de seguridad periódica de la base de datos para evitar la pérdida de información».

## Qué se respalda

| Base | Motor | Contenido | Archivo |
|---|---|---|---|
| `domain-db` | PostgreSQL 16 | Productos, proveedores, facturas, compras, numeración | `domain.sql.gz` |
| `authcore-db` | MySQL 8.4 | Usuarios y roles | `authcore.sql.gz` |

Cada respaldo es una carpeta `respaldos/AAAA-MM-DD_HHMMSS/` con los dos volcados comprimidos y un archivo
`sha256sums` para detectar daños. La carpeta `respaldos/` está en `.gitignore`: **los respaldos nunca se
suben al repositorio**, porque contienen datos de clientes y los hashes de las contraseñas.

## Política

| Tema | Decisión |
|---|---|
| Frecuencia | Diaria, a las 23:30 (después del cierre de la ferretería) |
| Retención | Los últimos 7 respaldos (`RETENER=7`, configurable) |
| Copia fuera del servidor | Semanal, copiada a otro lugar (por ejemplo, el equipo del administrador). Si el servidor se pierde, los respaldos que estaban en él se pierden con él |
| Prueba de restauración | Una vez al mes, en un entorno de prueba (ver más abajo) |
| Responsable | El rol de tester y documentación del equipo |

## Cómo respaldar

```bash
cd domain
./scripts/respaldo.sh
```

- El script lee las credenciales **dentro** de cada contenedor; no lee ni imprime el `.env`.
- Falla con código 1 si alguna base no está corriendo, y en ese caso no deja una carpeta a medias.
- Verifica que los dos volcados terminaron completos antes de darlos por buenos.

## Programarlo con cron (en el servidor)

```bash
crontab -e
# Respaldo diario a las 23:30; el registro queda en respaldos/cron.log
30 23 * * * cd /ruta/a/domain && ./scripts/respaldo.sh >> respaldos/cron.log 2>&1
```

## Cómo restaurar

La restauración **reemplaza** los datos actuales. Primero hay que detener las aplicaciones para que nadie
escriba mientras tanto:

```bash
cd domain
docker compose stop domain authcore
./scripts/restaurar.sh respaldos/2026-10-30_233000            # las dos bases; pide escribir RESTAURAR
./scripts/restaurar.sh respaldos/2026-10-30_233000 domain     # solo la del domain service
docker compose start domain authcore
./scripts/humo.sh                                             # comprobar que todo responde
```

`restaurar.sh` comprueba el `sha256` antes de tocar nada y rechaza un respaldo dañado. Con `--si` no pide
confirmación, pensado para pruebas automáticas.

## Prueba de restauración (mensual)

Se hace en un proyecto de Docker aparte, para no tocar los datos reales. Con `COMPOSE_PROJECT_NAME` se crea
un juego de bases nuevo y vacío:

```bash
cd domain
export COMPOSE_PROJECT_NAME=pruebarespaldo
docker compose up -d --wait authcore-db domain-db
./scripts/restaurar.sh respaldos/<el-más-reciente> todo --si
docker compose exec -T domain-db sh -c 'psql -tA -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT count(*) FROM productos"'
docker compose down -v        # borra SOLO el proyecto de prueba
unset COMPOSE_PROJECT_NAME
```

Si `docker compose down -v` se ejecuta sin `COMPOSE_PROJECT_NAME=pruebarespaldo`, borra los datos reales.
Compruebe la variable antes de ejecutarlo.

## Evidencia de la verificación (30/10/2026)

Se probó en un proyecto aislado, con bases propias:

| Paso | Resultado |
|---|---|
| Insertar datos (2 productos, 2 usuarios) y respaldar | Respaldo creado y verificado |
| Borrar 1 producto y 1 usuario | Quedan 1 y 1 |
| `restaurar.sh … todo --si` | Vuelven a 2 y 2, con los mismos valores |
| Restaurar dos veces seguidas | Sin error (el volcado incluye `DROP … IF EXISTS`) |
| Respaldo con un archivo alterado | Rechazado: «sha256 no coincide», código 1 |
| Restaurar sin escribir RESTAURAR | Cancelado, código 1 |
| `RETENER=2` y 3 respaldos seguidos | Quedan 2 |
| Respaldar con `domain-db` detenida | Código 1, sin carpeta nueva |
| Respaldo de las bases reales del sistema en marcha | 7 tablas en PostgreSQL y 2 en MySQL |
