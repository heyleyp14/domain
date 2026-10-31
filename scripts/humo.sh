#!/usr/bin/env bash
# Prueba de humo de punta a punta (HU-1 a HU-12) para Ferretería Ambiente Murano 3D
# Uso: ./scripts/humo.sh
# Requiere: curl, jq, pdftotext (poppler-utils), docker compose up

set -euo pipefail

# Cargar variables de entorno desde .env (en la raíz del domain/)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${SCRIPT_DIR}/../.env"
if [[ -f "$ENV_FILE" ]]; then
    set -a
    # shellcheck disable=SC1090
    source "$ENV_FILE"
    set +a
fi

# Configuración
AUTHCORE="${AUTHCORE:-http://localhost:8081}"
DOMAIN="${DOMAIN:-http://localhost:8085}"
EVIDENCIA_DIR="scripts/evidencia"
mkdir -p "$EVIDENCIA_DIR"
FECHA="$(date '+%Y-%m-%d')"
EVIDENCIA_FILE="$EVIDENCIA_DIR/humo-$FECHA.txt"

# Función para loguear a archivo y consola
log() {
    echo "$*" | tee -a "$EVIDENCIA_FILE"
}

# Función para paso OK
ok() {
    log "OK $1"
}

# Función para fallar
fail() {
    log "FAIL $1: $2"
    exit 1
}

# Función para hacer request y validar código HTTP
# Uso: http_code <esperado> <método> <url> [<datos>] [<headers...>]
http_code() {
    local expected="$1"; shift
    local method="$1"; shift
    local url="$1"; shift
    local data="${1:-}"; shift
    local headers=("$@")
    local curl_cmd=(curl -s -w "\n%{http_code}" -X "$method" "$url")
    if [[ -n "$data" ]]; then
        curl_cmd+=(-H "Content-Type: application/json" -d "$data")
    fi
    for h in "${headers[@]}"; do
        curl_cmd+=(-H "$h")
    done
    local response
    response="$("${curl_cmd[@]}")"
    local code
    code="$(echo "$response" | tail -n1)"
    local body
    body="$(echo "$response" | head -n-1)"
    if [[ "$code" != "$expected" ]]; then
        echo "Código esperado: $expected, recibido: $code" >&2
        echo "Respuesta: $body" >&2
        return 1
    fi
    echo "$body"
    return 0
}

# Verificar dependencias
for cmd in curl jq pdftotext; do
    if ! command -v "$cmd" &>/dev/null; then
        fail "DEPENDENCIA" "Falta $cmd"
    fi
done

log "=== Prueba de humo Ferretería Ambiente Murano 3D ==="
log "Fecha: $(date)"
log "AUTHCORE: $AUTHCORE"
log "DOMAIN: $DOMAIN"
log ""

# ============================================================
# HU-1: Registro de usuario
# ============================================================
log "--- HU-1: Registro ---"
VENDEDOR="vendedor-$RANDOM"
PASS_VENDEDOR="Vendedor123"

body=$(http_code 201 POST "$AUTHCORE/api/auth/register" "{\"username\":\"$VENDEDOR\",\"password\":\"$PASS_VENDEDOR\"}") || fail "HU-1 registro" "No se pudo crear usuario"
echo "$body" | jq -e '.id and .username' >/dev/null || fail "HU-1 registro" "Respuesta inválida: $body"
ok "HU-1 registro (201)"

# Repetido debe dar 409
http_code 409 POST "$AUTHCORE/api/auth/register" "{\"username\":\"$VENDEDOR\",\"password\":\"$PASS_VENDEDOR\"}" >/dev/null || fail "HU-1 duplicado" "Usuario repetido no dio 409"
ok "HU-1 duplicado (409)"

# ============================================================
# HU-2: Login
# ============================================================
log "--- HU-2: Login ---"
body=$(http_code 200 POST "$AUTHCORE/api/auth/login" "{\"username\":\"$VENDEDOR\",\"password\":\"$PASS_VENDEDOR\"}") || fail "HU-2 login" "Login falló"
TOKEN_VENDEDOR=$(echo "$body" | jq -r '.token')
[[ -n "$TOKEN_VENDEDOR" && "$TOKEN_VENDEDOR" != "null" ]] || fail "HU-2 login" "Token vacío"
ok "HU-2 login correcto (200, token)"

# Clave errónea -> 401
http_code 401 POST "$AUTHCORE/api/auth/login" "{\"username\":\"$VENDEDOR\",\"password\":\"wrong\"}" >/dev/null || fail "HU-2 clave errónea" "No dio 401"
ok "HU-2 clave errónea (401)"

# Usuario inexistente -> 401 (mismo mensaje)
http_code 401 POST "$AUTHCORE/api/auth/login" "{\"username\":\"noexiste-$RANDOM\",\"password\":\"wrong\"}" >/dev/null || fail "HU-2 usuario inexistente" "No dio 401"
ok "HU-2 usuario inexistente (401)"

# ============================================================
# HU-3: Roles (ADMIN)
# ============================================================
log "--- HU-3: Roles ---"
if [[ -z "${ADMIN_PASSWORD:-}" ]]; then
    fail "HU-3 admin login" "Variable ADMIN_PASSWORD no definida en el entorno"
fi
ADMIN_PASS="$ADMIN_PASSWORD"

# Login admin
body=$(http_code 200 POST "$AUTHCORE/api/auth/login" "{\"username\":\"admin\",\"password\":\"$ADMIN_PASS\"}") || fail "HU-3 admin login" "No se pudo loguear admin"
TOKEN_ADMIN=$(echo "$body" | jq -r '.token')
[[ -n "$TOKEN_ADMIN" && "$TOKEN_ADMIN" != "null" ]] || fail "HU-3 admin login" "Token admin vacío"
ok "HU-3 admin login (200)"

# Obtener ID del vendedor
body=$(http_code 200 GET "$AUTHCORE/api/auth/users" "" "Authorization: Bearer $TOKEN_ADMIN") || fail "HU-3 listar usuarios" "No se pudo listar usuarios"
VENDEDOR_ID=$(echo "$body" | jq -r --arg u "$VENDEDOR" '.[] | select(.username==$u) | .id')
[[ -n "$VENDEDOR_ID" && "$VENDEDOR_ID" != "null" ]] || fail "HU-3 ID vendedor" "No se encontró ID del vendedor"
ok "HU-3 listar usuarios (200)"

# Asignar rol ADMIN al vendedor
http_code 204 POST "$AUTHCORE/api/auth/users/$VENDEDOR_ID/roles" '{"role":"ADMIN"}' "Authorization: Bearer $TOKEN_ADMIN" >/dev/null || fail "HU-3 asignar ADMIN" "No se pudo asignar rol"
ok "HU-3 asignar ADMIN (204)"

# Verificar que aparece en la lista con el rol
body=$(http_code 200 GET "$AUTHCORE/api/auth/users" "" "Authorization: Bearer $TOKEN_ADMIN") || fail "HU-3 verificar rol" "No se pudo listar usuarios tras asignar"
echo "$body" | jq -e --arg u "$VENDEDOR" '.[] | select(.username==$u) | .roles[] | select(.=="ADMIN")' >/dev/null || fail "HU-3 verificar rol" "Rol ADMIN no aparece en lista"
ok "HU-3 rol ADMIN visible en lista"

# USER intentando asignar rol -> 403
http_code 403 POST "$AUTHCORE/api/auth/users/$VENDEDOR_ID/roles" '{"role":"ADMIN"}' "Authorization: Bearer $TOKEN_VENDEDOR" >/dev/null || fail "HU-3 USER asignar" "USER no dio 403 al asignar rol"
ok "HU-3 USER asignar rol (403)"

# ID inexistente -> 404
http_code 404 POST "$AUTHCORE/api/auth/users/999999/roles" '{"role":"ADMIN"}' "Authorization: Bearer $TOKEN_ADMIN" >/dev/null || fail "HU-3 ID inexistente" "ID inexistente no dio 404"
ok "HU-3 ID inexistente (404)"

# ============================================================
# HU-4 y HU-6: Autenticación y autorización en domain
# ============================================================
log "--- HU-4/HU-6: Auth en domain ---"

# Sin token -> 401
http_code 401 GET "$DOMAIN/api/productos" >/dev/null || fail "HU-4 sin token" "Sin token no dio 401"
ok "HU-4 sin token (401)"

# Token alterado -> 401
http_code 401 GET "$DOMAIN/api/productos" "" "Authorization: Bearer token.invalido.falso" >/dev/null || fail "HU-4 token alterado" "Token alterado no dio 401"
ok "HU-4 token alterado (401)"

# USER GET -> 200
http_code 200 GET "$DOMAIN/api/productos" "" "Authorization: Bearer $TOKEN_VENDEDOR" >/dev/null || fail "HU-6 USER GET" "USER GET no dio 200"
ok "HU-6 USER GET productos (200)"

# USER POST -> 403
http_code 403 POST "$DOMAIN/api/productos" '{"codigo":"TEST","nombre":"Test","precioBase":100,"aplicaIva":true,"stockInicial":10,"proveedorId":1}' "Authorization: Bearer $TOKEN_VENDEDOR" >/dev/null || fail "HU-6 USER POST" "USER POST no dio 403"
ok "HU-6 USER POST productos (403)"

# ============================================================
# HU-8: Catálogo (ADMIN)
# ============================================================
log "--- HU-8: Catálogo ---"

# Crear proveedor
PROVEEDOR_NOMBRE="Proveedor Test $RANDOM"
body=$(http_code 201 POST "$DOMAIN/api/proveedores" "{\"nombre\":\"$PROVEEDOR_NOMBRE\",\"telefono\":\"3000000000\",\"correo\":\"test@example.com\",\"direccion\":\"Calle 1\"}" "Authorization: Bearer $TOKEN_ADMIN") || fail "HU-8 crear proveedor" "No se pudo crear proveedor"
PROVEEDOR_ID=$(echo "$body" | jq -r '.id')
[[ -n "$PROVEEDOR_ID" && "$PROVEEDOR_ID" != "null" ]] || fail "HU-8 proveedor ID" "ID de proveedor vacío"
ok "HU-8 crear proveedor (201)"

# Crear producto
PRODUCTO_COD="TEST-$RANDOM"
body=$(http_code 201 POST "$DOMAIN/api/productos" "{\"codigo\":\"$PRODUCTO_COD\",\"nombre\":\"Producto Test\",\"precioBase\":10000,\"aplicaIva\":true,\"stockInicial\":50,\"proveedorId\":$PROVEEDOR_ID}" "Authorization: Bearer $TOKEN_ADMIN") || fail "HU-8 crear producto" "No se pudo crear producto"
ok "HU-8 crear producto (201)"

# Código repetido -> 409
http_code 409 POST "$DOMAIN/api/productos" "{\"codigo\":\"$PRODUCTO_COD\",\"nombre\":\"Otro\",\"precioBase\":100,\"aplicaIva\":true,\"stockInicial\":1,\"proveedorId\":$PROVEEDOR_ID}" "Authorization: Bearer $TOKEN_ADMIN" >/dev/null || fail "HU-8 código repetido" "Código repetido no dio 409"
ok "HU-8 código repetido (409)"

# Precio negativo -> 400
http_code 400 POST "$DOMAIN/api/productos" "{\"codigo\":\"NEG-$RANDOM\",\"nombre\":\"Negativo\",\"precioBase\":-1,\"aplicaIva\":true,\"stockInicial\":1,\"proveedorId\":$PROVEEDOR_ID}" "Authorization: Bearer $TOKEN_ADMIN" >/dev/null || fail "HU-8 precio negativo" "Precio negativo no dio 400"
ok "HU-8 precio negativo (400)"

# Búsqueda ?q=
body=$(http_code 200 GET "$DOMAIN/api/productos?q=$PRODUCTO_COD" "" "Authorization: Bearer $TOKEN_ADMIN") || fail "HU-8 búsqueda" "Búsqueda falló"
echo "$body" | jq -e --arg c "$PRODUCTO_COD" '.productos[] | select(.codigo==$c)' >/dev/null || fail "HU-8 búsqueda" "Producto no encontrado en búsqueda"
ok "HU-8 búsqueda por código (200)"

# Desactivar producto (POST /api/productos/{codigo}/desactivar)
http_code 200 POST "$DOMAIN/api/productos/$PRODUCTO_COD/desactivar" "" "Authorization: Bearer $TOKEN_ADMIN" >/dev/null || fail "HU-8 desactivar" "No se pudo desactivar producto"
ok "HU-8 desactivar producto (200)"

# Verificar desactivado
body=$(http_code 200 GET "$DOMAIN/api/productos?q=$PRODUCTO_COD" "" "Authorization: Bearer $TOKEN_ADMIN")
echo "$body" | jq -e '.productos[0].activo == false' >/dev/null || fail "HU-8 verificar desactivado" "Producto no está desactivado"
ok "HU-8 verificado desactivado"

# Reactivar producto (POST /api/productos/{codigo}/activar)
http_code 200 POST "$DOMAIN/api/productos/$PRODUCTO_COD/activar" "" "Authorization: Bearer $TOKEN_ADMIN" >/dev/null || fail "HU-8 reactivar" "No se pudo reactivar producto"
ok "HU-8 reactivar producto (200)"

# Verificar reactivado
body=$(http_code 200 GET "$DOMAIN/api/productos?q=$PRODUCTO_COD" "" "Authorization: Bearer $TOKEN_ADMIN")
echo "$body" | jq -e '.productos[0].activo == true' >/dev/null || fail "HU-8 verificar reactivado" "Producto no está activo"
ok "HU-8 verificado reactivado"

# ============================================================
# HU-9: Ventas y facturas (USER)
# ============================================================
log "--- HU-9: Ventas y facturas ---"

# Necesitamos un producto con stock para vender
# Crear otro producto con stock
PRODUCTO_VENTA_COD="VENTA-$RANDOM"
body=$(http_code 201 POST "$DOMAIN/api/productos" "{\"codigo\":\"$PRODUCTO_VENTA_COD\",\"nombre\":\"Producto Venta\",\"precioBase\":50000,\"aplicaIva\":true,\"stockInicial\":10,\"proveedorId\":$PROVEEDOR_ID}" "Authorization: Bearer $TOKEN_ADMIN") || fail "HU-9 crear producto venta" "No se pudo crear producto para venta"
ok "HU-9 crear producto para venta (201)"

# Obtener ID del producto
body=$(http_code 200 GET "$DOMAIN/api/productos?q=$PRODUCTO_VENTA_COD" "" "Authorization: Bearer $TOKEN_ADMIN")
PRODUCTO_VENTA_ID=$(echo "$body" | jq -r '.productos[0].id')
STOCK_INICIAL=$(echo "$body" | jq -r '.productos[0].stock')
ok "HU-9 stock inicial: $STOCK_INICIAL"

# USER vende 2 unidades
body=$(http_code 201 POST "$DOMAIN/api/facturas" "{\"clienteNombre\":\"Cliente Test\",\"clienteDireccion\":\"Calle 123\",\"clienteTelefono\":\"3001112233\",\"items\":[{\"codigo\":\"$PRODUCTO_VENTA_COD\",\"cantidad\":2}]}" "Authorization: Bearer $TOKEN_VENDEDOR") || fail "HU-9 venta" "Venta falló"
NUMERO_FACTURA=$(echo "$body" | jq -r '.numero')
TOTAL_FACTURA=$(echo "$body" | jq -r '.total')
[[ -n "$NUMERO_FACTURA" && "$NUMERO_FACTURA" != "null" ]] || fail "HU-9 número factura" "Número de factura vacío"
ok "HU-9 venta exitosa (201, $NUMERO_FACTURA)"

# Verificar stock bajó 2
body=$(http_code 200 GET "$DOMAIN/api/productos?q=$PRODUCTO_VENTA_COD" "" "Authorization: Bearer $TOKEN_VENDEDOR")
STOCK_DESPUES=$(echo "$body" | jq -r '.productos[0].stock')
if [[ "$STOCK_DESPUES" -ne $((STOCK_INICIAL - 2)) ]]; then
    fail "HU-9 stock" "Stock no bajó correctamente: era $STOCK_INICIAL, ahora $STOCK_DESPUES"
fi
ok "HU-9 stock decrementado ($STOCK_DESPUES)"

# Vender más del stock -> 409
body=$(http_code 409 POST "$DOMAIN/api/facturas" "{\"clienteNombre\":\"Cliente Test\",\"clienteDireccion\":\"Calle 123\",\"clienteTelefono\":\"3001112233\",\"items\":[{\"codigo\":\"$PRODUCTO_VENTA_COD\",\"cantidad\":100}]}" "Authorization: Bearer $TOKEN_VENDEDOR") || fail "HU-9 stock insuficiente" "Venta con stock insuficiente no dio 409"
# Verificar que el stock NO cambió
body=$(http_code 200 GET "$DOMAIN/api/productos?q=$PRODUCTO_VENTA_COD" "" "Authorization: Bearer $TOKEN_VENDEDOR")
STOCK_IGUAL=$(echo "$body" | jq -r '.productos[0].stock')
if [[ "$STOCK_IGUAL" -ne "$STOCK_DESPUES" ]]; then
    fail "HU-9 stock no consumido" "Stock cambió tras venta fallida: era $STOCK_DESPUES, ahora $STOCK_IGUAL"
fi
ok "HU-9 stock insuficiente (409, stock intacto)"

# PDF de la factura
body=$(http_code 200 GET "$DOMAIN/api/facturas/$NUMERO_FACTURA/pdf" "" "Authorization: Bearer $TOKEN_VENDEDOR" -H "Accept: application/pdf") || fail "HU-9 PDF" "No se pudo descargar PDF"
# Verificar que empieza con %PDF
echo "$body" | head -c 5 | grep -q "%PDF" || fail "HU-9 PDF contenido" "PDF no empieza con %PDF"
ok "HU-9 PDF factura (%PDF)"

# ADMIN anula con motivo (POST /api/facturas/{numero}/anulacion)
body=$(http_code 200 POST "$DOMAIN/api/facturas/$NUMERO_FACTURA/anulacion" '{"motivo":"Prueba de anulación"}' "Authorization: Bearer $TOKEN_ADMIN") || fail "HU-9 anular" "Anulación falló"
echo "$body" | jq -e '.estado == "ANULADA"' >/dev/null || fail "HU-9 estado anulada" "Estado no es ANULADA"
ok "HU-9 anular factura (200, ANULADA)"

# Verificar stock volvió
body=$(http_code 200 GET "$DOMAIN/api/productos?q=$PRODUCTO_VENTA_COD" "" "Authorization: Bearer $TOKEN_VENDEDOR")
STOCK_RESTAURADO=$(echo "$body" | jq -r '.productos[0].stock')
if [[ "$STOCK_RESTAURADO" -ne "$STOCK_INICIAL" ]]; then
    fail "HU-9 stock restaurado" "Stock no volvió al original: era $STOCK_INICIAL, ahora $STOCK_RESTAURADO"
fi
ok "HU-9 stock restaurado ($STOCK_RESTAURADO)"

# Anular de nuevo -> 409
http_code 409 POST "$DOMAIN/api/facturas/$NUMERO_FACTURA/anulacion" '{"motivo":"Otra vez"}' "Authorization: Bearer $TOKEN_ADMIN" >/dev/null || fail "HU-9 anular doble" "Segunda anulación no dio 409"
ok "HU-9 anular doble (409)"

# USER intenta anular -> 403
http_code 403 POST "$DOMAIN/api/facturas/$NUMERO_FACTURA/anulacion" '{"motivo":"USER"}' "Authorization: Bearer $TOKEN_VENDEDOR" >/dev/null || fail "HU-9 USER anular" "USER anular no dio 403"
ok "HU-9 USER anular (403)"

# ============================================================
# HU-10: Compras (ADMIN)
# ============================================================
log "--- HU-10: Compras ---"

# Registrar compra
FECHA_HOY=$(date '+%Y-%m-%d')
body=$(http_code 201 POST "$DOMAIN/api/compras" "{\"proveedorId\":$PROVEEDOR_ID,\"fecha\":\"$FECHA_HOY\",\"items\":[{\"codigo\":\"$PRODUCTO_VENTA_COD\",\"cantidad\":5,\"precioCompra\":30000}]}" "Authorization: Bearer $TOKEN_ADMIN") || fail "HU-10 compra" "Compra falló"
CODIGO_COMPRA=$(echo "$body" | jq -r '.codigo')
[[ -n "$CODIGO_COMPRA" && "$CODIGO_COMPRA" != "null" ]] || fail "HU-10 código compra" "Código de compra vacío"
ok "HU-10 compra registrada (201, $CODIGO_COMPRA)"

# Verificar stock subió
body=$(http_code 200 GET "$DOMAIN/api/productos?q=$PRODUCTO_VENTA_COD" "" "Authorization: Bearer $TOKEN_ADMIN")
STOCK_TRAS_COMPRA=$(echo "$body" | jq -r '.productos[0].stock')
if [[ "$STOCK_TRAS_COMPRA" -ne $((STOCK_INICIAL + 5)) ]]; then
    fail "HU-10 stock subió" "Stock no subió correctamente: era $STOCK_INICIAL, ahora $STOCK_TRAS_COMPRA"
fi
ok "HU-10 stock incrementado ($STOCK_TRAS_COMPRA)"

# Fecha futura -> 400
FECHA_FUTURA=$(date -d '+1 day' '+%Y-%m-%d')
http_code 400 POST "$DOMAIN/api/compras" "{\"proveedorId\":$PROVEEDOR_ID,\"fecha\":\"$FECHA_FUTURA\",\"items\":[{\"codigo\":\"$PRODUCTO_VENTA_COD\",\"cantidad\":1,\"precioCompra\":10000}]}" "Authorization: Bearer $TOKEN_ADMIN" >/dev/null || fail "HU-10 fecha futura" "Fecha futura no dio 400"
ok "HU-10 fecha futura (400)"

# USER intenta compra -> 403
http_code 403 POST "$DOMAIN/api/compras" "{\"proveedorId\":$PROVEEDOR_ID,\"fecha\":\"$FECHA_HOY\",\"items\":[{\"codigo\":\"$PRODUCTO_VENTA_COD\",\"cantidad\":1,\"precioCompra\":10000}]}" "Authorization: Bearer $TOKEN_VENDEDOR" >/dev/null || fail "HU-10 USER compra" "USER compra no dio 403"
ok "HU-10 USER compra (403)"

# ============================================================
# HU-11: Comparación de precios (ADMIN)
# ============================================================
log "--- HU-11: Comparación de precios ---"

# Crear segundo proveedor
PROVEEDOR2_NOMBRE="Proveedor2-$RANDOM"
body=$(http_code 201 POST "$DOMAIN/api/proveedores" "{\"nombre\":\"$PROVEEDOR2_NOMBRE\",\"telefono\":\"3000000001\",\"correo\":\"test2@example.com\",\"direccion\":\"Calle 2\"}" "Authorization: Bearer $TOKEN_ADMIN") || fail "HU-11 prov2" "No se pudo crear segundo proveedor"
PROVEEDOR2_ID=$(echo "$body" | jq -r '.id')
ok "HU-11 crear segundo proveedor (201)"

# Crear segundo producto para comparar
PRODUCTO_COMP_COD="COMP-$RANDOM"
body=$(http_code 201 POST "$DOMAIN/api/productos" "{\"codigo\":\"$PRODUCTO_COMP_COD\",\"nombre\":\"Producto Comparar\",\"precioBase\":20000,\"aplicaIva\":true,\"stockInicial\":0,\"proveedorId\":$PROVEEDOR_ID}" "Authorization: Bearer $TOKEN_ADMIN") || fail "HU-11 prod comparar" "No se pudo crear producto para comparar"
ok "HU-11 crear producto comparar (201)"

# Registrar compra del mismo producto en proveedor 1 (precio mayor)
body=$(http_code 201 POST "$DOMAIN/api/compras" "{\"proveedorId\":$PROVEEDOR_ID,\"fecha\":\"$FECHA_HOY\",\"items\":[{\"codigo\":\"$PRODUCTO_COMP_COD\",\"cantidad\":5,\"precioCompra\":20000}]}" "Authorization: Bearer $TOKEN_ADMIN") || fail "HU-11 compra prov1" "Compra en proveedor 1 falló"
ok "HU-11 compra proveedor 1 (201)"

# Registrar compra del mismo producto en proveedor 2 con precio menor
body=$(http_code 201 POST "$DOMAIN/api/compras" "{\"proveedorId\":$PROVEEDOR2_ID,\"fecha\":\"$FECHA_HOY\",\"items\":[{\"codigo\":\"$PRODUCTO_COMP_COD\",\"cantidad\":10,\"precioCompra\":15000}]}" "Authorization: Bearer $TOKEN_ADMIN") || fail "HU-11 compra prov2" "Compra en proveedor 2 falló"
ok "HU-11 compra proveedor 2 (201)"

# Comparar precios
body=$(http_code 200 GET "$DOMAIN/api/productos/$PRODUCTO_COMP_COD/comparacion-precios" "" "Authorization: Bearer $TOKEN_ADMIN") || fail "HU-11 comparar" "Comparación falló"
echo "$body" | jq -e '.ofertas | length == 2' >/dev/null || fail "HU-11 dos ofertas" "No hay dos ofertas"
# Verificar que se marca el menor
echo "$body" | jq -e '.ofertas[] | select(.esMenor == true)' >/dev/null || fail "HU-11 menor precio" "No se marca el menor precio"
ok "HU-11 comparación con dos proveedores (menor marcado)"

# Producto sin compras -> 200 con mensaje
PRODUCTO_SIN_COMP_COD="SINCOMP-$RANDOM"
body=$(http_code 201 POST "$DOMAIN/api/productos" "{\"codigo\":\"$PRODUCTO_SIN_COMP_COD\",\"nombre\":\"Sin Compras\",\"precioBase\":10000,\"aplicaIva\":true,\"stockInicial\":0,\"proveedorId\":$PROVEEDOR_ID}" "Authorization: Bearer $TOKEN_ADMIN") || fail "HU-11 prod sin compras" "No se pudo crear producto sin compras"
body=$(http_code 200 GET "$DOMAIN/api/productos/$PRODUCTO_SIN_COMP_COD/comparacion-precios" "" "Authorization: Bearer $TOKEN_ADMIN") || fail "HU-11 sin compras request" "Request falló"
echo "$body" | jq -e '.mensaje == "Este producto aún no tiene compras registradas"' >/dev/null || fail "HU-11 sin compras mensaje" "Mensaje incorrecto: $(echo "$body" | jq -r '.mensaje')"
ok "HU-11 producto sin compras (200, mensaje)"

# Producto inexistente -> 404
http_code 404 GET "$DOMAIN/api/productos/INEXISTENTE/comparacion-precios" "" "Authorization: Bearer $TOKEN_ADMIN" >/dev/null || fail "HU-11 inexistente" "Producto inexistente no dio 404"
ok "HU-11 producto inexistente (404)"

# ============================================================
# HU-12: Reporte diario (ADMIN)
# ============================================================
log "--- HU-12: Reporte diario ---"

# Reporte de hoy
body=$(http_code 200 GET "$DOMAIN/api/reportes/ventas-diarias?fecha=$FECHA_HOY" "" "Authorization: Bearer $TOKEN_ADMIN") || fail "HU-12 reporte hoy" "Reporte de hoy falló"
echo "$body" | jq -e '.fecha' >/dev/null || fail "HU-12 fecha" "Sin fecha en reporte"
ok "HU-12 reporte diario (200)"

# PDF del reporte
body=$(http_code 200 GET "$DOMAIN/api/reportes/ventas-diarias/pdf?fecha=$FECHA_HOY" "" "Authorization: Bearer $TOKEN_ADMIN" -H "Accept: application/pdf") || fail "HU-12 PDF reporte" "PDF reporte falló"
echo "$body" | head -c 5 | grep -q "%PDF" || fail "HU-12 PDF contenido" "PDF reporte no empieza con %PDF"
ok "HU-12 PDF reporte (%PDF)"

# Fecha inválida -> 400
http_code 400 GET "$DOMAIN/api/reportes/ventas-diarias?fecha=invalida" "" "Authorization: Bearer $TOKEN_ADMIN" >/dev/null || fail "HU-12 fecha inválida" "Fecha inválida no dio 400"
ok "HU-12 fecha inválida (400)"

# USER pide reporte -> 403
http_code 403 GET "$DOMAIN/api/reportes/ventas-diarias?fecha=$FECHA_HOY" "" "Authorization: Bearer $TOKEN_VENDEDOR" >/dev/null || fail "HU-12 USER reporte" "USER reporte no dio 403"
ok "HU-12 USER reporte (403)"

# ============================================================
# Consistencia (RNF-09): total en JSON == total en PDF
# ============================================================
log "--- RNF-09: Consistencia JSON/PDF ---"

# Obtener total del JSON de la factura (usar la factura anulada)
body=$(http_code 200 GET "$DOMAIN/api/facturas/$NUMERO_FACTURA" "" "Authorization: Bearer $TOKEN_ADMIN")
TOTAL_JSON=$(echo "$body" | jq -r '.total')

# Extraer total del PDF (formato colombiano: 119.000,00)
PDF_TMP=$(mktemp --suffix=.pdf)
http_code 200 GET "$DOMAIN/api/facturas/$NUMERO_FACTURA/pdf" "" "Authorization: Bearer $TOKEN_ADMIN" -H "Accept: application/pdf" > "$PDF_TMP"
TEXTO_PDF=$(pdftotext "$PDF_TMP" -)
rm -f "$PDF_TMP"

# Buscar el total en el PDF (línea que dice "Total:")
TOTAL_PDF_COLOMBIANO=$(echo "$TEXTO_PDF" | grep -E 'Total:' | sed -E 's/.*Total:[^0-9]*([0-9\.,]+).*/\1/')
# Convertir formato colombiano (119.000,00) a formato JSON (119000.00)
TOTAL_PDF_NORMALIZADO=$(echo "$TOTAL_PDF_COLOMBIANO" | sed 's/\.//g' | sed 's/,/./')

log "Total JSON: $TOTAL_JSON"
log "Total PDF (colombiano): $TOTAL_PDF_COLOMBIANO"
log "Total PDF (normalizado): $TOTAL_PDF_NORMALIZADO"

# Comparar
if [[ "$TOTAL_JSON" == "$TOTAL_PDF_NORMALIZADO" ]]; then
    ok "RNF-09 total JSON ($TOTAL_JSON) == total PDF ($TOTAL_PDF_COLOMBIANO)"
else
    fail "RNF-09 consistencia" "Total JSON ($TOTAL_JSON) != total PDF normalizado ($TOTAL_PDF_NORMALIZADO)"
fi

log ""
log "=== TODAS LAS PRUEBAS PASARON ==="
log "Evidencia guardada en: $EVIDENCIA_FILE"
exit 0