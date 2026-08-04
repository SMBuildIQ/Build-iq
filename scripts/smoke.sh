#!/usr/bin/env bash
# Smoke-test core launch paths against a running server (default localhost:3000)
set -euo pipefail
BASE="${1:-http://127.0.0.1:3000}"
COOKIE_JAR="$(mktemp)"
trap 'rm -f "$COOKIE_JAR"' EXIT

echo "== health =="
curl -sf "$BASE/api/health" | head -c 400
echo

echo "== public pages =="
for path in / /privacy /terms /support /login /signup; do
  code=$(curl -s -o /dev/null -w "%{http_code}" "$BASE$path")
  echo "$path $code"
  test "$code" = "200"
done

echo "== login =="
curl -sf -c "$COOKIE_JAR" -H "Content-Type: application/json" \
  -d '{"email":"demo@buildiq.app","password":"demo1234"}' \
  "$BASE/api/auth/login" | head -c 300
echo

echo "== me =="
curl -sf -b "$COOKIE_JAR" "$BASE/api/auth/me" | head -c 300
echo

echo "== projects =="
curl -sf -b "$COOKIE_JAR" "$BASE/api/projects" | head -c 400
echo

echo "== shop =="
curl -sf -b "$COOKIE_JAR" "$BASE/api/shop/packages" | head -c 200
echo

echo "== modules =="
curl -sf -b "$COOKIE_JAR" "$BASE/api/modules" | head -c 200
echo

echo "== logout =="
curl -sf -b "$COOKIE_JAR" -c "$COOKIE_JAR" -X POST "$BASE/api/auth/logout"
echo
echo "SMOKE OK"
