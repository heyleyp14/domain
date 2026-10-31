#!/usr/bin/env bash
# Restores a backup made by respaldo.sh. It REPLACES the current data of the chosen database(s).
#
# Usage:  ./scripts/restaurar.sh <carpeta-del-respaldo> [domain|authcore|todo] [--si]
#   <carpeta-del-respaldo>  for example respaldos/2026-10-30_220000
#   domain | authcore | todo  which database to restore (default: todo)
#   --si                    skip the confirmation prompt (for cron or tests)
#
# Stop the application services first so nobody writes while restoring:
#   docker compose stop domain authcore
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
compose() { docker compose -f "$ROOT/docker-compose.yml" "$@"; }

uso() { echo "Uso: $0 <carpeta-del-respaldo> [domain|authcore|todo] [--si]" >&2; exit 2; }

[[ $# -ge 1 ]] || uso
ORIGEN="$1"; shift
OBJETIVO="todo"; CONFIRMADO="no"
for arg in "$@"; do
  case "$arg" in
    domain|authcore|todo) OBJETIVO="$arg" ;;
    --si) CONFIRMADO="si" ;;
    *) uso ;;
  esac
done

[[ -d "$ORIGEN" ]] || { echo "No existe la carpeta $ORIGEN" >&2; exit 1; }
[[ -f "$ORIGEN/sha256sums" ]] || { echo "Falta $ORIGEN/sha256sums: no es un respaldo de respaldo.sh" >&2; exit 1; }
(cd "$ORIGEN" && sha256sum --quiet -c sha256sums) || { echo "El respaldo está dañado (sha256 no coincide)" >&2; exit 1; }

if [[ "$CONFIRMADO" != "si" ]]; then
  read -r -p "Esto REEMPLAZA los datos actuales de '$OBJETIVO' con $ORIGEN. Escriba RESTAURAR para continuar: " respuesta
  [[ "$respuesta" == "RESTAURAR" ]] || { echo "Cancelado."; exit 1; }
fi

if [[ "$OBJETIVO" == "domain" || "$OBJETIVO" == "todo" ]]; then
  gunzip -c "$ORIGEN/domain.sql.gz" | compose exec -T domain-db sh -c \
    'psql -q -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB"' > /dev/null
  echo "Restaurada la base del domain service."
fi

if [[ "$OBJETIVO" == "authcore" || "$OBJETIVO" == "todo" ]]; then
  gunzip -c "$ORIGEN/authcore.sql.gz" | compose exec -T authcore-db sh -c \
    'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysql -u root "$MYSQL_DATABASE"'
  echo "Restaurada la base de AuthCore."
fi

echo "Listo. Vuelva a arrancar los servicios: docker compose start domain authcore"
