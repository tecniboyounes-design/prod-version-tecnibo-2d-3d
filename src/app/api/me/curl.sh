#!/usr/bin/env bash
set -euo pipefail

# OAuth + /api/me flow smoke test.
# Override per run:
# BASE_URL="https://backend.tecnibo.com" OAUTH_CODE="..." OAUTH_STATE="..." ./curl.sh

BASE_URL="${BASE_URL:-https://backend.tecnibo.com}"
COOKIE_JAR="${COOKIE_JAR:-./me.cookies.txt}"
RETURN_TO="${RETURN_TO:-%2F}"
OAUTH_CODE="${OAUTH_CODE:-PASTE_CODE_HERE}"
OAUTH_STATE="${OAUTH_STATE:-PASTE_STATE_HERE}"

echo "=== 1) /api/odoo/login (sets oauth state cookies) ==="
curl -i -sS -c "$COOKIE_JAR" \
  "$BASE_URL/api/odoo/login?returnTo=$RETURN_TO"

echo
echo "=== 2) /api/odoo/callback (optional manual) ==="
if [[ "$OAUTH_CODE" != "PASTE_CODE_HERE" && "$OAUTH_STATE" != "PASTE_STATE_HERE" ]]; then
  curl -i -sS -b "$COOKIE_JAR" -c "$COOKIE_JAR" \
    "$BASE_URL/api/odoo/callback?code=$OAUTH_CODE&state=$OAUTH_STATE"
else
  echo "Skip manual callback. Set OAUTH_CODE and OAUTH_STATE after browser login."
fi

echo
echo "=== 3) /api/me ==="
curl -sS -b "$COOKIE_JAR" \
  "$BASE_URL/api/me?debug=1" | jq .

echo
echo "=== 4) /api/odoo/partner ==="
curl -sS -b "$COOKIE_JAR" \
  "$BASE_URL/api/odoo/partner" | jq .

echo
echo "=== 5) /api/odoo/web/session/get_session_info (proxied Odoo endpoint) ==="
curl -sS -b "$COOKIE_JAR" -H "Content-Type: application/json" \
  -d '{}' "$BASE_URL/api/odoo/web/session/get_session_info" | jq .

echo
echo "=== 6) /api/odoo/logout ==="
curl -i -sS -b "$COOKIE_JAR" -c "$COOKIE_JAR" \
  "$BASE_URL/api/odoo/logout"

