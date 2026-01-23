#!/bin/bash

BASE_URL="${BASE_URL:-http://192.168.30.92:3009}"
API_BASE="${BASE_URL%/}/api"

PROJECT_ID="${PROJECT_ID:-330126ef-baf3-4d6f-9763-5e421c973318}"
VERSION_ID="${VERSION_ID:-d77a8ffc-f003-4f8c-b28d-4f0d65aae75a}"
ODOO_ID="${ODOO_ID:-447}"

payload=$(cat <<JSON
{
  "project_id": "$PROJECT_ID",
  "version_id": "$VERSION_ID",
  "odoo_id": $ODOO_ID
}
JSON
)

is_json() {
  echo "$1" | jq -e . >/dev/null 2>&1
}

print_response() {
  local label="$1"
  local body="$2"
  echo "$label"
  if is_json "$body"; then
    echo "$body" | jq .
  else
    echo "$body"
  fi
}

echo "1) POST $API_BASE/public-share"
response_post=$(curl -sS -X POST "$API_BASE/public-share" \
  -H "Content-Type: application/json" \
  -d "$payload")
print_response "POST Response:" "$response_post"

if ! is_json "$response_post"; then
  echo "POST response is not JSON; cannot continue."
  exit 1
fi

share_url=$(echo "$response_post" | jq -r '.url // empty')
share_id=$(echo "$response_post" | jq -r '.share.id // empty')

if [[ -z "$share_url" || -z "$share_id" ]]; then
  echo "Missing url or share.id in response; cannot continue."
  exit 1
fi

echo ""
echo "2) GET $API_BASE/public-share/lists/$ODOO_ID"
response_list=$(curl -sS "$API_BASE/public-share/lists/$ODOO_ID")
print_response "List Response:" "$response_list"

echo ""
echo "3) GET $API_BASE/public-share/$share_id"
response_get_by_id=$(curl -sS "$API_BASE/public-share/$share_id")
print_response "Share By ID Response:" "$response_get_by_id"

echo ""
echo "4) GET $share_url"
response_get_token=$(curl -sS "$share_url")
print_response "Token Response:" "$response_get_token"

echo ""
echo "5) POST $API_BASE/public-share/revoke/$share_id"
response_revoke=$(curl -sS -X POST "$API_BASE/public-share/revoke/$share_id")
print_response "Revoke Response:" "$response_revoke"

echo ""
echo "6) GET $API_BASE/public-share/$share_id (after revoke)"
response_get_by_id_after=$(curl -sS "$API_BASE/public-share/$share_id")
print_response "Share By ID After Revoke Response:" "$response_get_by_id_after"

echo ""
echo "7) GET $share_url (after revoke)"
response_get_token_after=$(curl -sS "$share_url")
print_response "Token After Revoke Response:" "$response_get_token_after"

