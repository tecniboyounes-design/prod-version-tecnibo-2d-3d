SESSION_ID="f2c6fa9eeca23e822ae300c7dfe780df038a07b7"
ODOO_AT="ksywLo8dvQwEjKbWUMeb-xngeWojYeeRmVJDKo78UJXbqhi8LdBdeg"
BACKEND="https://backend.tecnibo.com"

# 2. Fetch me
ME=$(curl -s "$BACKEND/api/me" \
  -H "Cookie: session_id=$SESSION_ID; odoo_at=$ODOO_AT")

echo $ME | jq .

