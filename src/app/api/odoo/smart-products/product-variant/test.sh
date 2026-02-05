curl -sS "http://localhost:3009/api/odoo/smart-products/product-variant/221266" \
  -H "X-Session-Id: aa0483256b2dfa9daca3c4b8199d3a0673848449" \
  | jq .



curl -sS "http://localhost:3009/api/odoo/smart-products/product-variant/221266?fields=id,display_name,default_code,list_price,image_1920" \
  -H "X-Session-Id: aa0483256b2dfa9daca3c4b8199d3a0673848449" \
  | jq .
 

# row.odoo.records[0].product_variant_ids[0].id   // this is where id located to get full product info





