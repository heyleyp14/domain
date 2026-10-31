#!/usr/bin/env bash
# Checks the AuthCore acceptance criteria that humo.sh cannot see from HTTP alone (HU-1, HU-4, HU-5,
# HU-6), by also looking at its database and logs. AuthCore is the professor's code and is not
# modified: criteria it does not meet are reported as "NO CUMPLE (D2)" and do not fail the script.
# The script fails (exit 1) only when something AuthCore does implement stops working.
#
# Usage (from domain/, with the system running):  ./scripts/verificar-authcore.sh
# Env: AUTHCORE (default http://localhost:8081)
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
AUTHCORE="${AUTHCORE:-http://localhost:8081}"
compose() { docker compose -f "$ROOT/docker-compose.yml" "$@"; }
sql() {
  compose exec -T authcore-db sh -c 'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysql -N -u root "$MYSQL_DATABASE"' <<< "$1" 2>/dev/null
}

fallas=0; brechas=0
ok()        { echo "OK        $1"; }
falla()     { echo "FALLA     $1"; fallas=$((fallas + 1)); }
no_cumple() { echo "NO CUMPLE $1 (D2)"; brechas=$((brechas + 1)); }

register() {
  jq -n --arg u "$1" --arg p "$2" '{username:$u,password:$p}' \
    | curl -s -o "${3:-/dev/null}" -w '%{http_code}' -X POST "$AUTHCORE/api/auth/register" -H 'Content-Type: application/json' -d @-
}

sufijo="$(date +%s)$RANDOM"
clave="Verif${sufijo}x9"
usuario_a="verif-a-$sufijo"; usuario_b="verif-b-$sufijo"
respuesta="$(mktemp)"; trap 'rm -f "$respuesta"' EXIT

# HU-1: register returns 201 and never echoes the password.
codigo="$(register "$usuario_a" "$clave" "$respuesta")"
[[ "$codigo" == 201 ]] && ok "HU-1 registro responde 201" || falla "HU-1 registro respondió $codigo"
grep -qi -e password -e "$clave" "$respuesta" && falla "HU-1 la respuesta contiene la contraseña" || ok "HU-1 la respuesta no contiene la contraseña"
register "$usuario_b" "$clave" >/dev/null

# HU-1: new users get the USER role by default.
roles="$(sql "SELECT r.role FROM user_roles r JOIN users u ON u.id = r.user_id WHERE u.username = '$usuario_a';" | tr '\n' ' ' || true)"
[[ "$roles" == "USER " ]] && ok "HU-1 el usuario nuevo queda con rol USER" || falla "HU-1 roles del usuario nuevo: '$roles'"

# HU-5: BCrypt hashes, salted, never plain text.
prefijos="$(sql "SELECT LEFT(password_hash, 4) FROM users WHERE username IN ('$usuario_a', '$usuario_b');" | sort -u | tr '\n' ' ')"
[[ "$prefijos" =~ ^\$2[aby]\$\ $ ]] && ok "HU-5 las contraseñas se guardan con BCrypt" || falla "HU-5 formato de hash inesperado: '$prefijos'"
distintos="$(sql "SELECT COUNT(DISTINCT password_hash) FROM users WHERE username IN ('$usuario_a', '$usuario_b');")"
[[ "$distintos" == 2 ]] && ok "HU-5 misma contraseña, hashes distintos (sal)" || falla "HU-5 dos usuarios con la misma clave tienen el mismo hash"
planos="$(sql "SELECT COUNT(*) FROM users WHERE password_hash NOT LIKE '\$2%';")"
[[ "$planos" == 0 ]] && ok "HU-5 ninguna contraseña en texto plano" || falla "HU-5 hay $planos contraseñas sin hash BCrypt"

# HU-1: the password never reaches the logs.
compose logs --no-color authcore 2>/dev/null | grep -qF "$clave" \
  && falla "HU-1 la contraseña aparece en los logs" || ok "HU-1 la contraseña no aparece en los logs"

# HU-6: the token carries an expiration and a signature.
token="$(jq -n --arg u "$usuario_a" --arg p "$clave" '{username:$u,password:$p}' \
  | curl -s -X POST "$AUTHCORE/api/auth/login" -H 'Content-Type: application/json' -d @- | jq -r .token)"
payload="$(cut -d. -f2 <<< "$token" | tr '_-' '/+')"
while (( ${#payload} % 4 )); do payload+="="; done
exp="$(base64 -d <<< "$payload" 2>/dev/null | jq -r '.exp // empty')"
[[ "$exp" =~ ^[0-9]+$ ]] && ok "HU-6 el JWT incluye exp" || falla "HU-6 el JWT no trae exp"
[[ -n "$(cut -d. -f3 <<< "$token")" ]] && ok "HU-6 el JWT está firmado" || falla "HU-6 el JWT no tiene firma"

# Known gaps (D2): reported, not failed.
codigo="$(register "corta-$sufijo" "abc123")"
[[ "$codigo" == 400 ]] && ok "HU-1 contraseña de 6 caracteres rechazada" \
  || no_cumple "HU-1 acepta una contraseña de 6 caracteres sin exigir 8 con letras y números (respondió $codigo)"
codigo="$(register "solo-letras-$sufijo" "abcdefghij")"
[[ "$codigo" == 400 ]] && ok "HU-1 contraseña sin números rechazada" \
  || no_cumple "HU-1 acepta una contraseña sin números (respondió $codigo)"
codigo="$(register "no es un email $sufijo" "$clave")"
[[ "$codigo" == 400 ]] && ok "HU-1 formato de usuario o email validado" \
  || no_cumple "HU-1 no valida el formato del usuario o email (respondió $codigo)"
codigo="$(curl -s -o /dev/null -w '%{http_code}' "$AUTHCORE/api/auth/users")"
[[ "$codigo" == 401 ]] && ok "HU-4 sin token responde 401" \
  || no_cumple "HU-4 sin token responde $codigo en lugar de 401"
codigo="$(curl -s -o /dev/null -w '%{http_code}' "$AUTHCORE/api/auth/users" -H 'Authorization: Bearer x.y.z')"
[[ "$codigo" == 401 ]] && ok "HU-4 token inválido responde 401" \
  || no_cumple "HU-4 token inválido responde $codigo en lugar de 401"

echo "Resultado: $fallas fallas, $brechas brechas conocidas (D2)"
(( fallas == 0 ))
