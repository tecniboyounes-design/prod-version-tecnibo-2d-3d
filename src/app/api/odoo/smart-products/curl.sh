curl -sS "http://192.168.30.92:3009/api/odoo/smart-products?mode=flat&include_odoo=1&include_stock=1&limit_rows=10&odoo_chunk=80&match_field=ref_imos" \
  -H "X-Session-Id: 52aee5136ef019abfe358ea7c1405206c2f4b5a9" \
  | jq 



