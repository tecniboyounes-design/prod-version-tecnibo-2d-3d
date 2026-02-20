#!/usr/bin/env bash
set -euo pipefail

# ==== Static config (edit these once) ====
BASE_URL="https://backend.tecnibo.com"
COOKIE_JAR="./odoo.cookies.txt"
RETURN_TO="%2F"

# Optional: only used if you want to call callback manually.
OAUTH_CODE="PASTE_CODE_HERE"
OAUTH_STATE="PASTE_STATE_HERE"

# Required for X-Session-Id endpoints.
SESSION_ID="PASTE_SESSION_ID_HERE"

echo "=== 1) Start OAuth (302 + state cookies) ==="
curl -i -sS -c "$COOKIE_JAR" \
  "$BASE_URL/api/odoo/login?returnTo=$RETURN_TO"

echo
echo "=== 2) Browser login step ==="
echo "Open the Location URL from step 1 in browser."
echo "After login, callback sets: odoo_at, odoo_rt, session_id."

echo
echo "=== 3) Optional manual callback ==="
if [[ "$OAUTH_CODE" != "PASTE_CODE_HERE" && "$OAUTH_STATE" != "PASTE_STATE_HERE" ]]; then
  curl -i -sS -b "$COOKIE_JAR" -c "$COOKIE_JAR" \
    "$BASE_URL/api/odoo/callback?code=$OAUTH_CODE&state=$OAUTH_STATE"
else
  echo "Skipping manual callback (set OAUTH_CODE and OAUTH_STATE to enable)."
fi

echo
echo "=== 4) Cookie-based endpoints ==="
curl -sS -b "$COOKIE_JAR" \
  "$BASE_URL/api/odoo/partner" | jq .

curl -sS -b "$COOKIE_JAR" -H "Content-Type: application/json" \
  -d '{}' "$BASE_URL/api/odoo/web/session/get_session_info" | jq .

echo
echo "=== 5) X-Session-Id endpoints ==="
if [[ "$SESSION_ID" == "PASTE_SESSION_ID_HERE" ]]; then
  echo "Set SESSION_ID at the top of this file, then rerun."
  exit 1
fi

curl -sS -H "X-Session-Id: $SESSION_ID" \
  "$BASE_URL/api/odoo/models?q=product&limit=20&offset=0" | jq .

curl -sS -H "X-Session-Id: $SESSION_ID" \
  "$BASE_URL/api/odoo/fields?model=product.template&onlyStored=1&types=char,many2one,float" | jq .

curl -sS -H "X-Session-Id: $SESSION_ID" \
  "$BASE_URL/api/odoo/smart-products?q=KU15RA65&include_vendors=1&limit=80&offset=0" | jq .

curl -sS -H "X-Session-Id: $SESSION_ID" \
  "$BASE_URL/api/odoo/smart-products?mode=flat&include_odoo=1&include_stock=1&include_vendors=1&limit_rows=50" | jq .

curl -sS -H "X-Session-Id: $SESSION_ID" \
  "$BASE_URL/api/odoo/smart-products?mode=ws&include_odoo=1&include_vendors=1&limit_rows=100&match_field=ref_imos" | jq .

curl -sS -H "X-Session-Id: $SESSION_ID" \
  "$BASE_URL/api/odoo/smart-products/product-variant/221266" | jq .

echo
echo "=== 6) Logout ==="
curl -i -sS -b "$COOKIE_JAR" -c "$COOKIE_JAR" \
  "$BASE_URL/api/odoo/logout"
