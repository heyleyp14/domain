#!/usr/bin/env bash
# Changes the password of an AuthCore user (by default the bootstrap "admin") WITHOUT modifying
# AuthCore's code (decision D2). AdminBootstrapRunner only creates "admin" when it does not exist, so
# replacing its BCrypt hash in the database is permanent.
#
# Usage:  ./scripts/cambiar-clave-admin.sh [usuario]          # asks for the new password twice
#         NUEVA_CLAVE=... ./scripts/cambiar-clave-admin.sh   # non-interactive (scripts, tests)
#
# Rules for the new password: at least 12 characters, with letters and digits.
# The password is never passed as a command-line argument and is never printed.
# Tokens issued before the change stay valid until they expire (authcore.jwt.expiration-ms).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
USUARIO="${1:-admin}"
compose() { docker compose -f "$ROOT/docker-compose.yml" "$@"; }

[[ "$USUARIO" =~ ^[A-Za-z0-9._@-]{1,100}$ ]] || { echo "Nombre de usuario inválido: $USUARIO" >&2; exit 2; }
[[ -n "$(compose ps -q --status running authcore-db)" ]] || { echo "authcore-db no está corriendo" >&2; exit 1; }

if [[ -n "${NUEVA_CLAVE:-}" ]]; then
  clave="$NUEVA_CLAVE"
else
  read -r -s -p "Nueva contraseña para $USUARIO: " clave; echo
  read -r -s -p "Repítala: " repetida; echo
  [[ "$clave" == "$repetida" ]] || { echo "Las contraseñas no coinciden" >&2; exit 2; }
fi
if (( ${#clave} < 12 )) || ! [[ "$clave" =~ [A-Za-z] && "$clave" =~ [0-9] ]]; then
  echo "La contraseña debe tener al menos 12 caracteres, con letras y números" >&2
  exit 2
fi
[[ "$clave" != *$'\n'* ]] || { echo "La contraseña no puede tener saltos de línea" >&2; exit 2; }

# BCrypt with cost 10, the same cost AuthCore uses. htpasswd reads the password from stdin (-i).
hash="$(printf '%s\n' "$clave" | docker run --rm -i --quiet httpd:2.4-alpine htpasswd -niBC 10 "$USUARIO" | cut -d: -f2-)"
[[ "$hash" =~ ^\$2[aby]\$10\$[./A-Za-z0-9]{53}$ ]] || { echo "No se pudo generar el hash BCrypt" >&2; exit 1; }

filas="$(compose exec -T authcore-db sh -c 'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysql -N -u root "$MYSQL_DATABASE"' 2>/dev/null <<SQL
UPDATE users SET password_hash = '$hash' WHERE username = '$USUARIO';
SELECT ROW_COUNT();
SQL
)"
[[ "$filas" == 1 ]] || { echo "No existe el usuario $USUARIO (filas actualizadas: ${filas:-0})" >&2; exit 1; }
echo "Contraseña de $USUARIO cambiada."

# Keep ADMIN_PASSWORD in .env in sync, because humo.sh and rendimiento.sh log in with it.
if [[ "$USUARIO" == admin && -f "$ROOT/.env" ]] && grep -q '^ADMIN_PASSWORD=' "$ROOT/.env"; then
  tmp="$(mktemp "$ROOT/.env.XXXXXX")"
  CLAVE="$clave" awk 'BEGIN { c = ENVIRON["CLAVE"] } /^ADMIN_PASSWORD=/ { print "ADMIN_PASSWORD=" c; next } { print }' "$ROOT/.env" > "$tmp"
  chmod 600 "$tmp" && mv "$tmp" "$ROOT/.env"
  echo "ADMIN_PASSWORD actualizado en .env."
fi
