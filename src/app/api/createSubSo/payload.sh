curl -sS -X POST "https://backend.tecnibo.com/api/createSubSo" \
  -H "Content-Type: application/json" \
  -H "X-Session-Id: 3b43b02efd7cb65c454c9d4eb5cafb6532e301ee" \
  -d '{
  "router": " imos | odoo ",
  "project_id": 1993,
  "phase_id": 7267,
  "confirm": false,
  "items": [
    { "id": 1020858,   "quantity": 1, "route_id": 25 }
    { "id": 1020855,   "quantity": 1, "route_id": 25 }
  ]
}' | jq .





curl -sS -X POST "https://backend.tecnibo.com/api/createSubSo" \
  -H "Content-Type: application/json" \
  -H "X-Session-Id: 3b43b02efd7cb65c454c9d4eb5cafb6532e301ee" \
  -d '{
"odoo_project_id": 1993,
"analytic_account_id": 3290,
"userData": {
"uid": 446,
"user_companies": {
"current_company": 11
}
},
"phase_id": 7267,
"items": [
{
"id": 172400,
"quantity": 3,
"price": 0,
"name": "Promante 15473 Constru-Fix cartouche 290ml - Colle silicone blanche à adhésion immédiate",
"routing": null,
"dimensions": {},
"variables": {},
"route_id": 25
}
],
"knobs": {
"picking_type_id": 95,
"notes": "Purchase Order created via Tecnibo RP   "
},
"date_order": "2020-04-13",
"date_planned": "2020-04-08",
"origin": "[200091] Documentation know system",
"project_id": 1993,
"user_id": 446,
"company_id": 11,
"confirm": false
}' | jq .



