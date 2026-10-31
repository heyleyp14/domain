#!/usr/bin/env bash
# Backs up both databases (RNF-12): PostgreSQL of the domain service and MySQL of AuthCore.
#
# Usage (from anywhere):   ./scripts/respaldo.sh
# Output:                  respaldos/AAAA-MM-DD_HHMMSS/{domain.sql.gz,authcore.sql.gz,sha256sums}
# Retention:               keeps the newest $RETENER backups (default 7) and deletes older ones.
#
# Credentials are read inside each container from its own environment, so this script never
# reads or prints .env. The compose project is the one in docker-compose.yml; set
# COMPOSE_PROJECT_NAME to target another one (used by the restore test).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DESTINO_BASE="${RESPALDOS_DIR:-$ROOT/respaldos}"
RETENER="${RETENER:-7}"
compose() { docker compose -f "$ROOT/docker-compose.yml" "$@"; }

if ! [[ "$RETENER" =~ ^[1-9][0-9]*$ ]]; then
  echo "RETENER debe ser un entero mayor que 0 (valor actual: $RETENER)" >&2
  exit 2
fi
for servicio in domain-db authcore-db; do
  if [[ -z "$(compose ps -q --status running "$servicio")" ]]; then
    echo "El servicio $servicio no está corriendo; levante el sistema con 'docker compose up -d'." >&2
    exit 1
  fi
done

umask 077
DESTINO="$DESTINO_BASE/$(date +%Y-%m-%d_%H%M%S)"
mkdir -p "$DESTINO"
# On any failure, do not leave a half-written backup that a later restore could pick up.
trap 'echo "El respaldo falló; se elimina $DESTINO" >&2; rm -rf -- "$DESTINO"' ERR

compose exec -T domain-db sh -c \
  'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists --no-owner' \
  | gzip -9 > "$DESTINO/domain.sql.gz"

compose exec -T authcore-db sh -c \
  'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysqldump -u root --single-transaction --routines --triggers "$MYSQL_DATABASE"' \
  | gzip -9 > "$DESTINO/authcore.sql.gz"

# A dump that does not end cleanly is not a backup.
gunzip -c "$DESTINO/domain.sql.gz" | grep -q 'PostgreSQL database dump complete'
gunzip -c "$DESTINO/authcore.sql.gz" | tail -n 1 | grep -q 'Dump completed'

(cd "$DESTINO" && sha256sum domain.sql.gz authcore.sql.gz > sha256sums)
trap - ERR

# Retention: backup folders are named by date, so sorting by name sorts by age.
mapfile -t todos < <(find "$DESTINO_BASE" -mindepth 1 -maxdepth 1 -type d -name '20*' | sort)
if (( ${#todos[@]} > RETENER )); then
  for viejo in "${todos[@]:0:${#todos[@]}-RETENER}"; do
    rm -rf -- "$viejo"
    echo "Eliminado por retención: $(basename "$viejo")"
  done
fi

echo "Respaldo creado: $DESTINO"
du -h "$DESTINO"/*.sql.gz
