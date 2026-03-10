

curl -sS "http://192.168.30.92:3009/api/odoo/smart-products?mode=flat&include_odoo=1&include_stock=1&include_vendors=1&limit_rows=0&log=1" \
  -H "X-Session-Id: c2d2194889346d28d2a2029f4f19e90261179371" | jq .




curl -sS "https://backend.tecnibo.com/api/odoo/smart-products?mode=flat&include_odoo=1&include_stock=1&include_vendors=1&limit_rows=10&log=1" \
  -H "X-Session-Id: c2d2194889346d28d2a2029f4f19e90261179371" | jq .





SELLERS="$(curl -sS "https://tecnibo.com/web/dataset/call_kw/product.template/search_read" \
  -H "Content-Type: application/json" \
  -H "Cookie: session_id=e38db1ad20b9d2cff26806fb2ec4fc0373b9fc15" \
  -d '{
    "jsonrpc":"2.0","id":2,"method":"call",
    "params":{
      "model":"product.template",
      "method":"search_read",
      "args":[[], ["seller_ids"]],
      "kwargs":{"limit":50,"order":"id desc"}
    }
  }' | jq -c '[.result[].seller_ids[]] | unique')"




curl -sS "https://tecnibo.com/web/dataset/call_kw/product.supplierinfo/read" \
  -H "Content-Type: application/json" \
  -H "Cookie: session_id=e38db1ad20b9d2cff26806fb2ec4fc0373b9fc15" \
  -d "{
    \"jsonrpc\":\"2.0\",\"id\":3,\"method\":\"call\",
    \"params\":{
      \"model\":\"product.supplierinfo\",
      \"method\":\"read\",
      \"args\":[ ${SELLERS}, [\"id\",\"partner_id\",\"product_tmpl_id\",\"min_qty\",\"price\",\"delay\"] ],
      \"kwargs\":{}
    }
  }" | jq '.result[] | {id, partner_id, product_tmpl_id, min_qty, price, delay}'






# ---- Sample payload (reference only; not executable)
: <<'SAMPLE_PAYLOAD'
{
"partner_id": 11787,
"odoo_project_id": 1993,
"analytic_account_id": 3290,
"userData": {
"uid": 446,
"user_companies": {
"current_company": 11
}
},
"phase_id": 7271,
"items": [
{
"id": 336615,
"name": "Cylindre 65/65 Duo (3 clés)",
"active": true,
"default_code": "D_CYL_DUO_65x65",
"barcode": "CON_D_CYL_DUO_65x65",
"imos_table": "imos.conndesc",
"imos_name": "ACCS_PORT_CY02_65x65_INOX",
"matched_info": true,
"matched_date": "2025-06-27 14:46:45",
"matched_bom": true,
"ref_imos": "D_CYL_DUO_65x65",
"product_variant_id": 336615,
"product_variant_ids": [
{
"id": 336615,
"display_name": "[D_CYL_DUO_65x65] Cylindre 65/65 Duo (3 clés)",
"default_code": "D_CYL_DUO_65x65"
}
],
"seller_ids": [
4892349,
5003658,
3392626,
4815803,
203576,
4817734,
4817735,
4817736,
4967585
],
"categ_id": {
"id": 15,
"display_name": "Tous / IMOS / Quincailleries"
},
"uom_id": {
"id": 1,
"display_name": "Pièce(s)"
},
"cfg_name": "ACCS_PORT_CY02_65x65_INOX",
"routing": "odoo",
"vendors": [
{
"id": 4892349,
"partner_id": [
803,
"Lecot nv-sa"
],
"product_tmpl_id": [
339227,
"[D_CYL_DUO_65x65] Cylindre 65/65 Duo (3 clés)"
],
"product_id": null,
"min_qty": 1,
"price": 57.71,
"delay": 1,
"sequence": 1,
"company_id": null
},
{
"id": 5003658,
"partner_id": [
1,
"Wood CAM SRL"
],
"product_tmpl_id": [
339227,
"[D_CYL_DUO_65x65] Cylindre 65/65 Duo (3 clés)"
],
"product_id": null,
"min_qty": 0,
"price": 0,
"delay": 14,
"sequence": 1,
"company_id": [
4,
"Tecnibo Lux SA"
]
},
{
"id": 3392626,
"partner_id": [
5270,
"Fernand Georges"
],
"product_tmpl_id": [
339227,
"[D_CYL_DUO_65x65] Cylindre 65/65 Duo (3 clés)"
],
"product_id": null,
"min_qty": 1,
"price": 42.34,
"delay": 14,
"sequence": 2,
"company_id": null
},
{
"id": 4815803,
"partner_id": [
803,
"Lecot nv-sa"
],
"product_tmpl_id": [
339227,
"[D_CYL_DUO_65x65] Cylindre 65/65 Duo (3 clés)"
],
"product_id": null,
"min_qty": 1,
"price": 51.47,
"delay": 21,
"sequence": 3,
"company_id": null
},
{
"id": 203576,
"partner_id": [
1,
"Wood CAM SRL"
],
"product_tmpl_id": [
339227,
"[D_CYL_DUO_65x65] Cylindre 65/65 Duo (3 clés)"
],
"product_id": null,
"min_qty": 0,
"price": 0,
"delay": 14,
"sequence": 4,
"company_id": [
7,
"Tecnibo Belgium SA"
]
},
{
"id": 4817734,
"partner_id": [
774,
"Häfele Belgium NV"
],
"product_tmpl_id": [
339227,
"[D_CYL_DUO_65x65] Cylindre 65/65 Duo (3 clés)"
],
"product_id": null,
"min_qty": 0,
"price": 0,
"delay": 1,
"sequence": 5,
"company_id": [
1,
"Wood CAM SRL"
]
},
{
"id": 4817735,
"partner_id": [
3005,
"Häfele SE & Co KG"
],
"product_tmpl_id": [
339227,
"[D_CYL_DUO_65x65] Cylindre 65/65 Duo (3 clés)"
],
"product_id": null,
"min_qty": 0,
"price": 0,
"delay": 1,
"sequence": 6,
"company_id": [
4,
"Tecnibo Lux SA"
]
},
{
"id": 4817736,
"partner_id": [
2458,
"Tecnibo Lux SA"
],
"product_tmpl_id": [
339227,
"[D_CYL_DUO_65x65] Cylindre 65/65 Duo (3 clés)"
],
"product_id": null,
"min_qty": 0,
"price": 0,
"delay": 1,
"sequence": 7,
"company_id": [
1,
"Wood CAM SRL"
]
},
{
"id": 4967585,
"partner_id": [
803,
"Lecot nv-sa"
],
"product_tmpl_id": [
339227,
"[D_CYL_DUO_65x65] Cylindre 65/65 Duo (3 clés)"
],
"product_id": null,
"min_qty": 30,
"price": 41.37,
"delay": 0,
"sequence": 8,
"company_id": [
1,
"Wood CAM SRL"
]
}
],
"vendor_partner_ids": [
803,
1,
5270,
774,
3005,
2458
],
"vendor_primary": {
"id": 4892349,
"partner_id": [
803,
"Lecot nv-sa"
],
"product_tmpl_id": [
339227,
"[D_CYL_DUO_65x65] Cylindre 65/65 Duo (3 clés)"
],
"product_id": null,
"min_qty": 1,
"price": 57.71,
"delay": 1,
"sequence": 1,
"company_id": null
},
"stock": {
"qty_available": 28,
"free_qty": 28,
"virtual_available": 28,
"incoming_qty": 0,
"outgoing_qty": 0
},
"article_id": 336615,
"price": 0,
"type": "shop-item",
"customizable": false,
"dimensions": {},
"variables": {},
"inStock": true,
"stockQuantity": 28,
"hasCfg": true,
"cartQuantity": 0,
"remainingStock": 28,
"D_DOOR_TYPE": "DD",
"D_DOOR_SUPPLIER": "SD",
"D_DOOR_FANLIGHT": "NO_FANLIGHT",
"P_ACOUSTIC_PERFORMANCE": "42",
"P_HEIGHT": 2700,
"P_MODULATION_TYPE": "DEFAULT",
"P_GL_MODULATION": "900",
"P_PRF_COLOR": "9005",
"P_PRF_COLOR_FINISH": "CX",
"P_GLASS_TYPE": "C",
"P_FS_QUANTITY": 2,
"P_FS_SETTING": "REGULAR",
"P_FS_DIST_BOT": 300,
"P_FS_DIST_TOP": 300,
"P_STORES": "None",
"P_VITROPHANIE": "NO",
"P_COSTUMER_REQUEST": "",
"P_DEPTH": 102,
"cp_Id": "ACCS_PORT_CY02_65x65_INOX",
"articleDescription": {
"D_DOOR_TYPE": {
"label": "Type de Porte",
"value": "DD"
},
"D_DOOR_SUPPLIER": {
"label": "Fournisseur",
"value": "SD"
},
"D_DOOR_FANLIGHT": {
"label": "Fournisseur",
"value": "NO_FANLIGHT"
},
"P_ACOUSTIC_PERFORMANCE": {
"label": "Acoustic Performance",
"value": "42"
},
"P_HEIGHT": {
"label": "Height",
"value": 2700
},
"P_GLASS_TYPE": {
"label": "Glass Type",
"value": "C"
},
"P_FS_QUANTITY": {
"label": "Fixed shelves Quantity",
"value": 2
},
"P_FS_SETTING": {
"label": "Frame fixed shelves Division",
"value": "REGULAR"
},
"P_FS_DIST_BOT": {
"label": "Distance From Bottom",
"value": 300
},
"P_FS_DIST_TOP": {
"label": "Distance From Top",
"value": 300
},
"P_STORES": {
"label": "Stores",
"value": "None"
},
"P_VITROPHANIE": {
"label": "Glass Film",
"value": "NO"
},
"P_COSTUMER_REQUEST": {
"label": "Costumer Request",
"value": ""
},
"P_DEPTH": {
"label": "Depth",
"value": 102
}
},
"articleProperties": [
{
"label": "Model",
"depth": 0,
"fields": [
{
"name": "D_DOOR_TYPE",
"label": "Type de Porte",
"value": "DD"
},
{
"name": "D_DOOR_SUPPLIER",
"label": "Fournisseur",
"value": "SD"
},
{
"name": "D_DOOR_FANLIGHT",
"label": "Fournisseur",
"value": "NO_FANLIGHT"
}
],
"subsections": []
},
{
"label": "Performance",
"depth": 0,
"fields": [
{
"name": "P_ACOUSTIC_PERFORMANCE",
"label": "Acoustic Performance",
"value": "42"
}
],
"subsections": []
},
{
"label": "Dimensions",
"depth": 0,
"fields": [
{
"name": "P_HEIGHT",
"label": "Height",
"value": 2700
}
],
"subsections": []
},
{
"label": "Material",
"depth": 0,
"fields": [
{
"name": "P_GLASS_TYPE",
"label": "Glass Type",
"value": "C"
}
],
"subsections": []
},
{
"label": "Advanced",
"depth": 0,
"fields": [
{
"name": "P_FS_QUANTITY",
"label": "Fixed shelves Quantity",
"value": 2
},
{
"name": "P_FS_SETTING",
"label": "Frame fixed shelves Division",
"value": "REGULAR"
},
{
"name": "P_STORES",
"label": "Stores",
"value": "None"
},
{
"name": "P_VITROPHANIE",
"label": "Glass Film",
"value": "NO"
}
],
"subsections": [
{
"label": "Horizental plat advenced Setting",
"depth": 1,
"fields": [
{
"name": "P_FS_DIST_BOT",
"label": "Distance From Bottom",
"value": 300
},
{
"name": "P_FS_DIST_TOP",
"label": "Distance From Top",
"value": 300
}
],
"subsections": []
}
]
},
{
"label": "Costumer Info",
"depth": 0,
"fields": [
{
"name": "P_COSTUMER_REQUEST",
"label": "Costumer Request",
"value": ""
}
],
"subsections": []
},
{
"label": "Vars",
"depth": 0,
"fields": [
{
"name": "P_DEPTH",
"label": "Depth",
"value": 102
}
],
"subsections": []
}
],
"isConfigured": true,
"configuredAt": "2026-02-09T13:19:48.636Z",
"quantity": 1,
"addedAt": "2026-02-09T13:19:48.636Z",
"source": "shop",
"isShopItem": true
}
],
"knobs": {
"picking_type_id": 95,
"notes": "Documentation know system",
},
"date_order": "2020-05-31",
"date_planned": "2020-04-08",
"origin": "[200091] Documentation know system",
"project_id": 1993,
"user_id": 446,
"company_id": 11,
"confirm": false
}
SAMPLE_PAYLOAD
