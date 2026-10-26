#!/usr/bin/env bash
# Serve the built example through a disposable OrbStack nginx container, then remove it.
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
name="svadmin-example-smoke-$(openssl rand -hex 3)"
cleanup() { docker --context orbstack rm -f "$name" >/dev/null 2>&1 || true; }
trap cleanup EXIT

if [[ ! -f "$root/example/dist/index.html" ]]; then
  echo "example/dist is missing; run bun run build:example first" >&2
  exit 1
fi

docker --context orbstack run -d --name "$name" --pull missing \
  -p 127.0.0.1::80 \
  -v "$root/example/dist:/usr/share/nginx/html:ro" \
  nginx:alpine >/dev/null
address="$(docker --context orbstack port "$name" 80/tcp | awk 'NR==1 { print $1 }')"
hostport="${address##*:}"
code="$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:${hostport}/")"
if [[ "$code" != 200 ]]; then
  echo "Example deploy returned HTTP ${code}" >&2
  exit 1
fi
echo "Example deploy HTTP 200 on 127.0.0.1:${hostport}; removing ${name}"
