

curl -sS "http://192.168.30.92:3009/api/odoo/smart-products?mode=flat&include_odoo=1&include_stock=1&include_vendors=1&limit_rows=10&log=1" \
  -H "X-Session-Id: a41425b1fcff07c9c8bee287c2057d7ea8026ad1" | jq .





curl -sS "https://backend.tecnibo.com/api/odoo/smart-products?mode=flat&include_odoo=1&include_stock=1&include_vendors=1&limit_rows=0&log=0" \
  -H "X-Session-Id: a41425b1fcff07c9c8bee287c2057d7ea8026ad1" | jq .




SELLERS="$(curl -sS "https://erptest.tecnibo.com/web/dataset/call_kw/product.template/search_read" \
  -H "Content-Type: application/json" \
  -H "Cookie: session_id=a41425b1fcff07c9c8bee287c2057d7ea8026ad1" \
  -d '{
    "jsonrpc":"2.0","id":2,"method":"call",
    "params":{
      "model":"product.template",
      "method":"search_read",
      "args":[[], ["seller_ids"]],
      "kwargs":{"limit":50,"order":"id desc"}
    }
  }' | jq -c '[.result[].seller_ids[]] | unique')"





curl -sS "https://erptest.tecnibo.com/web/dataset/call_kw/product.supplierinfo/read" \
  -H "Content-Type: application/json" \
  -H "Cookie: session_id=a41425b1fcff07c9c8bee287c2057d7ea8026ad1" \
  -d "{
    \"jsonrpc\":\"2.0\",\"id\":3,\"method\":\"call\",
    \"params\":{
      \"model\":\"product.supplierinfo\",
      \"method\":\"read\",
      \"args\":[ ${SELLERS}, [\"id\",\"partner_id\",\"product_tmpl_id\",\"min_qty\",\"price\",\"delay\"] ],
      \"kwargs\":{}
    }
  }" | jq '.result[] | {id, partner_id, product_tmpl_id, min_qty, price, delay}'
