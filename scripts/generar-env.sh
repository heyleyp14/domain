#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$ROOT/.env"

if [[ -e "$ENV_FILE" ]]; then
  echo ".env already exists; leaving it untouched."
  exit 0
fi

# 36 random bytes -> 48 base64 characters, within the 32-63 byte range.
JWT_SECRET="$(openssl rand -base64 36)"
JWT_SECRET_BASE64="$(printf '%s' "$JWT_SECRET" | base64 -w0)"
MYSQL_ROOT_PASSWORD="$(openssl rand -hex 16)"
MYSQL_PASSWORD="$(openssl rand -hex 16)"
POSTGRES_PASSWORD="$(openssl rand -hex 16)"
MYSQL_DATABASE="authcoredb"
MYSQL_USER="authcore"
POSTGRES_DB="ferreteria"
POSTGRES_USER="ferreteria"
# AdminBootstrapRunner hardcodes this password (D2); AuthCore ignores the variable for now.
ADMIN_PASSWORD="admin123"

umask 077
cat > "$ENV_FILE" <<EOF
JWT_SECRET=$JWT_SECRET
JWT_SECRET_BASE64=$JWT_SECRET_BASE64
MYSQL_ROOT_PASSWORD=$MYSQL_ROOT_PASSWORD
MYSQL_DATABASE=$MYSQL_DATABASE
MYSQL_USER=$MYSQL_USER
MYSQL_PASSWORD=$MYSQL_PASSWORD
POSTGRES_DB=$POSTGRES_DB
POSTGRES_USER=$POSTGRES_USER
POSTGRES_PASSWORD=$POSTGRES_PASSWORD
ADMIN_PASSWORD=$ADMIN_PASSWORD
NEGOCIO_NOMBRE="Ferretería Ambiente Murano 3D"
NEGOCIO_NIT=
NEGOCIO_DIRECCION=
NEGOCIO_TELEFONO=
NEGOCIO_CIUDAD=Cúcuta
EOF

echo "Created $ENV_FILE"
