#!/usr/bin/env bash
# Measures product search latency (RNF-07) with a catalog of N products.
#
# Usage:  ./scripts/rendimiento.sh [--forzar]
# Env:    DOMAIN       domain service URL (default http://localhost:8085)
#         AUTHCORE     AuthCore URL, used to log in as admin (default http://localhost:8081)
#         ADMIN_PASSWORD  admin password, read from the environment or from ../.env
#         TOKEN        an ADMIN token; when set, the script does not log in
#         N_PRODUCTOS  products to load (default 5000)
#         N_BUSQUEDAS  searches to time (default 50)
#
# It CREATES N_PRODUCTOS products (codes PERF-00001...). It refuses to run against a catalog that
# already has products unless --forzar is given: use a separate test instance, never production.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DOMAIN="${DOMAIN:-http://localhost:8085}"
AUTHCORE="${AUTHCORE:-http://localhost:8081}"
N_PRODUCTOS="${N_PRODUCTOS:-5000}"
N_BUSQUEDAS="${N_BUSQUEDAS:-50}"
FORZAR="no"
[[ "${1:-}" == "--forzar" ]] && FORZAR="si"

for n in "$N_PRODUCTOS" "$N_BUSQUEDAS"; do
  [[ "$n" =~ ^[1-9][0-9]*$ ]] || { echo "N_PRODUCTOS y N_BUSQUEDAS deben ser enteros mayores que 0" >&2; exit 2; }
done
command -v jq >/dev/null || { echo "Falta jq" >&2; exit 2; }

if [[ -z "${TOKEN:-}" ]]; then
  if [[ -z "${ADMIN_PASSWORD:-}" && -f "$ROOT/.env" ]]; then
    ADMIN_PASSWORD="$(grep -E '^ADMIN_PASSWORD=' "$ROOT/.env" | head -1 | cut -d= -f2-)"
  fi
  [[ -n "${ADMIN_PASSWORD:-}" ]] || { echo "Defina ADMIN_PASSWORD o TOKEN" >&2; exit 2; }
  TOKEN="$(jq -n --arg p "$ADMIN_PASSWORD" '{username:"admin",password:$p}' \
    | curl -sf -X POST "$AUTHCORE/api/auth/login" -H 'Content-Type: application/json' -d @- | jq -r .token)"
  [[ -n "$TOKEN" && "$TOKEN" != "null" ]] || { echo "No se pudo iniciar sesión como admin en $AUTHCORE" >&2; exit 1; }
fi
AUTH="Authorization: Bearer $TOKEN"

existentes="$(curl -s "$DOMAIN/api/productos" -H "$AUTH" | jq -r '.total // empty' 2>/dev/null || true)"
if ! [[ "$existentes" =~ ^[0-9]+$ ]]; then
  echo "No se pudo consultar el catálogo en $DOMAIN (¿servicio caído o token rechazado?)" >&2
  exit 1
fi
if [[ "$existentes" != "0" && "$FORZAR" != "si" ]]; then
  echo "El catálogo de $DOMAIN ya tiene $existentes productos. Este script crea $N_PRODUCTOS más." >&2
  echo "Use una instancia de prueba, o --forzar si está seguro." >&2
  exit 1
fi

echo "== Carga: 1 proveedor y $N_PRODUCTOS productos en $DOMAIN"
proveedor="$(jq -n --arg n "Proveedor Rendimiento $RANDOM" '{nombre:$n,telefono:"3000000000"}' \
  | curl -sf -X POST "$DOMAIN/api/proveedores" -H "$AUTH" -H 'Content-Type: application/json' -d @- | jq -r .id)"
[[ "$proveedor" =~ ^[0-9]+$ ]] || { echo "No se pudo crear el proveedor" >&2; exit 1; }

nombres=(Martillo Clavo Tornillo Tuerca Arandela Brocha Pintura Cemento Varilla Alambre Llave Taladro Lija Cinta Tubo)
inicio_carga=$(date +%s)
seq 1 "$N_PRODUCTOS" | while read -r i; do
  printf '{"codigo":"PERF-%05d","nombre":"%s modelo %d","precioBase":%d.50,"aplicaIva":%s,"stockInicial":%d,"proveedorId":%s}\n' \
    "$i" "${nombres[i % ${#nombres[@]}]}" "$i" $(( 1000 + i % 90000 )) "$([[ $((i % 3)) -eq 0 ]] && echo false || echo true)" \
    $(( i % 40 )) "$proveedor"
done | xargs -P 8 -d '\n' -I{} curl -s -o /dev/null -w '%{http_code}\n' -X POST "$DOMAIN/api/productos" \
        -H "$AUTH" -H 'Content-Type: application/json' -d '{}' \
  | sort | uniq -c | awk '{printf "   HTTP %s: %s\n", $2, $1}'
echo "   Carga en $(( $(date +%s) - inicio_carga )) s"

total="$(curl -sf "$DOMAIN/api/productos" -H "$AUTH" | jq -r .total)"
echo "   Productos en el catálogo: $total"

# Representative searches: exact code, partial name, supplier, low stock, active only, no match.
consultas=("q=PERF-02500" "q=martillo" "q=tornillo%20modelo%201" "q=Proveedor%20Rendimiento" "bajoStock=true"
           "soloActivos=true" "q=zzz-no-existe" "q=cinta&soloActivos=true")
echo "== $N_BUSQUEDAS búsquedas (GET /api/productos?...)"
tiempos="$(mktemp)"; trap 'rm -f "$tiempos"' EXIT
for ((i = 0; i < N_BUSQUEDAS; i++)); do
  q="${consultas[i % ${#consultas[@]}]}"
  curl -s -o /dev/null -w '%{time_total} %{http_code} %{size_download}\n' "$DOMAIN/api/productos?$q" -H "$AUTH" >> "$tiempos"
done

errores="$(awk '$2 != 200' "$tiempos" | wc -l)"
sort -n -k1,1 "$tiempos" | awk -v errores="$errores" '
  { t[NR] = $1; bytes += $3 }
  END {
    p50 = t[int((NR + 1) / 2)]; idx95 = int(NR * 0.95 + 0.999); if (idx95 > NR) idx95 = NR
    printf "   Mediana: %.3f s\n   Percentil 95: %.3f s\n   Máximo: %.3f s\n", p50, t[idx95], t[NR]
    printf "   Respuestas con error: %d de %d\n   Tamaño medio de la respuesta: %.0f KB\n", errores, NR, bytes / NR / 1024
  }'
