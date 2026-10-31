#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${ENV_FILE:-$ROOT/.env}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "ERROR: $ENV_FILE not found" >&2
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

if [[ -z "${JWT_SECRET:-}" || -z "${JWT_SECRET_BASE64:-}" ]]; then
  echo "ERROR: JWT_SECRET and JWT_SECRET_BASE64 must be set" >&2
  exit 1
fi

decoded="$(printf '%s' "$JWT_SECRET_BASE64" | base64 -d 2>/dev/null || true)"
if [[ "$decoded" != "$JWT_SECRET" ]]; then
  echo "ERROR: JWT_SECRET_BASE64 does not decode to JWT_SECRET" >&2
  exit 1
fi

len="${#JWT_SECRET}"
if (( len < 32 || len > 63 )); then
  echo "ERROR: JWT_SECRET must be between 32 and 63 bytes (got $len)" >&2
  exit 1
fi

echo "OK: shared JWT secret is consistent ($len bytes)"
