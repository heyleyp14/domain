#!/usr/bin/env bash
# Seed de demostración: reinicia la base y crea 20 proveedores, 20 productos, 20 compras y 20 facturas
# con las fechas del día en que se ejecuta (hora de Bogotá). Así el inicio, el reporte diario y la
# tendencia siempre tienen datos, sin tareas automáticas ni borrados programados.
#
# Uso: ./scripts/seed.sh
# Requiere: curl, jq y el sistema arriba (docker compose up). Lee ADMIN_PASSWORD de .env.
# El seed tarda ~20-25 s si Cloudinary está configurado: publica un PDF por factura.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${SCRIPT_DIR}/../.env"
if [[ -f "$ENV_FILE" ]]; then
    set -a
    # shellcheck disable=SC1090
    source "$ENV_FILE"
    set +a
fi

AUTHCORE="${AUTHCORE:-http://localhost:8081}"
DOMAIN="${DOMAIN:-http://localhost:8085}"

if [[ -z "${ADMIN_PASSWORD:-}" ]]; then
    echo "Falta ADMIN_PASSWORD en .env (scripts/generar-env.sh la crea)." >&2
    exit 1
fi

echo "Iniciando sesión como admin en $AUTHCORE..."
LOGIN="$(curl -sS -X POST "$AUTHCORE/api/auth/login" \
    -H 'Content-Type: application/json' \
    -d "{\"username\":\"admin\",\"password\":\"$ADMIN_PASSWORD\"}")"
TOKEN="$(jq -r '.token // empty' <<<"$LOGIN")"
if [[ -z "$TOKEN" ]]; then
    echo "No se pudo iniciar sesión como admin: $LOGIN" >&2
    exit 1
fi

echo "Sembrando datos de demostración (fechas de hoy)..."
RESPUESTA="$(curl -sS --max-time 300 -X POST "$DOMAIN/api/seed" \
    -H "Authorization: Bearer $TOKEN")"

if ! jq -e '.proveedores' >/dev/null 2>&1 <<<"$RESPUESTA"; then
    echo "El seed falló: $RESPUESTA" >&2
    exit 1
fi

jq -r '"Listo: \(.proveedores) proveedores, \(.productos) productos, \(.compras) compras y \(.facturas) facturas."' <<<"$RESPUESTA"
echo "Hoy quedó con ventas, stock bajo y reporte diario. Abre http://localhost:8080"
