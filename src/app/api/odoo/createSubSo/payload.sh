#!/usr/bin/env bash
set -euo pipefail

# This is an abdl3adim session id, not valid for this endpoint:
# -H "X-Session-Id: 5b24f946f861893cbb411892ec5f3fa55c8a5bb3"

curl -sS -X POST "https://backend.tecnibo.com/api/odoo/createSubSo" \
  -H "Content-Type: application/json" \
  -H "X-Session-Id: 5b24f946f861893cbb411892ec5f3fa55c8a5bb3" \
  --data-binary @- <<'JSON' | jq .
{
  "flow": "warehouse",
  "project_id": 1993,
  "confirm": false,
  "auto_assign_delivery": false,
  "auto_validate_delivery": false,
  "commitment_date": "2026-03-01",
  "debug": true,
  "knobs": {
    "picking_type_id": 95,
    "notes": " rapport de test pour la création d'un sous-ordre de vente à partir d'une commande de vente existante = new payload shape rabie test_N3"
  },
  "items": [
    {
      "id": 1000020,
      "name": "Set de 2 charnières pour réfrigérateur et congélateur",
      "active": true,
      "default_code": "00481147",
      "barcode": "CON_00481147",
      "imos_table": "imos.conndesc",
      "imos_name": "SI_FH_00481147",
      "matched_info": true,
      "matched_date": "2025-06-27 14:49:52",
      "matched_bom": true,
      "ref_imos": "00481147",
      "product_variant_id": 1009285,
      "variables": {
        "D_MOVABLE_SUPPLIER": "Parthos",
        "P_EXT_DESRIPTION": "TRTDDS EHLFDGLDFLGFDLG",
        "P_EXT_PRICE": "50",
        "P_EXT_QUANTITY": "100",
        "P_HEIGHT": 2700,
        "P_WIDTH": 1200
      },
      "product_variant_ids": [
        {
          "id": 1009285,
          "display_name": "[00481147] Set de 2 charnières pour réfrigérateur et congélateur",
          "default_code": "00481147"
        }
      ],
      "seller_ids": [
        5003949,
        4606201,
        4606218,
        4606594,
        4606957,
        4812187,
        4813716,
        4816596,
        4816655,
        4816769
      ],
      "categ_id": { "id": 15, "display_name": "Tous / IMOS / Quincailleries" },
      "uom_id": { "id": 1, "display_name": "Unité(s)" },
      "cfg_name": null,
      "routing": "odoo",
      "vendors": [
        {
          "id": 5003949,
          "partner_id": [1, "Wood CAM SRL"],
          "product_tmpl_id": [1000020, "[00481147] Set de 2 charnières pour réfrigérateur et congélateur"],
          "product_id": null,
          "min_qty": 0,
          "price": 0,
          "delay": 14,
          "sequence": 1,
          "company_id": [7, "Tecnibo Belgium SA"]
        },
        {
          "id": 4606201,
          "partner_id": [1, "Wood CAM SRL"],
          "product_tmpl_id": [1000020, "[00481147] Set de 2 charnières pour réfrigérateur et congélateur"],
          "product_id": null,
          "min_qty": 1,
          "price": 1,
          "delay": 0,
          "sequence": 2,
          "company_id": [4, "Tecnibo Lux SA"]
        },
        {
          "id": 4606218,
          "partner_id": [1, "Wood CAM SRL"],
          "product_tmpl_id": [1000020, "[00481147] Set de 2 charnières pour réfrigérateur et congélateur"],
          "product_id": null,
          "min_qty": 1,
          "price": 1,
          "delay": 0,
          "sequence": 3,
          "company_id": [4, "Tecnibo Lux SA"]
        },
        {
          "id": 4606594,
          "partner_id": [3137, "BSH Home Appliances"],
          "product_tmpl_id": [1000020, "[00481147] Set de 2 charnières pour réfrigérateur et congélateur"],
          "product_id": null,
          "min_qty": 2,
          "price": 41.46,
          "delay": 0,
          "sequence": 4,
          "company_id": [1, "Wood CAM SRL"]
        },
        {
          "id": 4606957,
          "partner_id": [1, "Wood CAM SRL"],
          "product_tmpl_id": [1000020, "[00481147] Set de 2 charnières pour réfrigérateur et congélateur"],
          "product_id": null,
          "min_qty": 1,
          "price": 1,
          "delay": 0,
          "sequence": 5,
          "company_id": [1, "Wood CAM SRL"]
        },
        {
          "id": 4812187,
          "partner_id": [1, "Wood CAM SRL"],
          "product_tmpl_id": [1000020, "[00481147] Set de 2 charnières pour réfrigérateur et congélateur"],
          "product_id": null,
          "min_qty": 3,
          "price": 41.45,
          "delay": 0,
          "sequence": 6,
          "company_id": [4, "Tecnibo Lux SA"]
        },
        {
          "id": 4813716,
          "partner_id": [3137, "BSH Home Appliances"],
          "product_tmpl_id": [1000020, "[00481147] Set de 2 charnières pour réfrigérateur et congélateur"],
          "product_id": null,
          "min_qty": 15,
          "price": 41.45,
          "delay": 0,
          "sequence": 7,
          "company_id": [1, "Wood CAM SRL"]
        },
        {
          "id": 4816596,
          "partner_id": [3137, "BSH Home Appliances"],
          "product_tmpl_id": [1000020, "[00481147] Set de 2 charnières pour réfrigérateur et congélateur"],
          "product_id": null,
          "min_qty": 15,
          "price": 41.45,
          "delay": 0,
          "sequence": 8,
          "company_id": [1, "Wood CAM SRL"]
        },
        {
          "id": 4816655,
          "partner_id": [1, "Wood CAM SRL"],
          "product_tmpl_id": [1000020, "[00481147] Set de 2 charnières pour réfrigérateur et congélateur"],
          "product_id": null,
          "min_qty": 3,
          "price": 41.45,
          "delay": 0,
          "sequence": 9,
          "company_id": [4, "Tecnibo Lux SA"]
        },
        {
          "id": 4816769,
          "partner_id": [1, "Wood CAM SRL"],
          "product_tmpl_id": [1000020, "[00481147] Set de 2 charnières pour réfrigérateur et congélateur"],
          "product_id": null,
          "min_qty": 3,
          "price": 41.45,
          "delay": 0,
          "sequence": 10,
          "company_id": [4, "Tecnibo Lux SA"]
        }
      ],
      "vendor_partner_ids": [1, 3137],
      "vendor_primary": {
        "id": 5003949,
        "partner_id": [1, "Wood CAM SRL"],
        "product_tmpl_id": [1000020, "[00481147] Set de 2 charnières pour réfrigérateur et congélateur"],
        "product_id": null,
        "min_qty": 0,
        "price": 0,
        "delay": 14,
        "sequence": 1,
        "company_id": [7, "Tecnibo Belgium SA"]
      },
      "stock": {
        "qty_available": 23,
        "free_qty": 23,
        "virtual_available": 23,
        "incoming_qty": 0,
        "outgoing_qty": 0
      }
    },
    {
      "id": 998599,
      "name": "Charnière Siemens pour réfrigérateur encastrable",
      "active": true,
      "default_code": "00492680",
      "barcode": "CON_00492680",
      "imos_table": "imos.conndesc",
      "imos_name": "SI_FH_00492680",
      "matched_info": true,
      "matched_date": "2025-06-27 14:46:20",
      "matched_bom": true,
      "ref_imos": "00492680",
      "product_variant_id": 1007866,
      "product_variant_ids": [
        {
          "id": 1007866,
          "display_name": "[00492680] Charnière Siemens pour réfrigérateur encastrable",
          "default_code": "00492680"
        }
      ],
      "seller_ids": [4578069, 4578070, 4578071, 4584274],
      "categ_id": { "id": 15, "display_name": "Tous / IMOS / Quincailleries" },
      "uom_id": { "id": 1, "display_name": "Unité(s)" },
      "cfg_name": null,
      "routing": "odoo",
      "vendors": [
        {
          "id": 4578069,
          "partner_id": [1, "Wood CAM SRL"],
          "product_tmpl_id": [998599, "[00492680] Charnière Siemens pour réfrigérateur encastrable"],
          "product_id": null,
          "min_qty": 0,
          "price": 0,
          "delay": 14,
          "sequence": 1,
          "company_id": [4, "Tecnibo Lux SA"]
        },
        {
          "id": 4578070,
          "partner_id": [1, "Wood CAM SRL"],
          "product_tmpl_id": [998599, "[00492680] Charnière Siemens pour réfrigérateur encastrable"],
          "product_id": null,
          "min_qty": 0,
          "price": 0,
          "delay": 14,
          "sequence": 1,
          "company_id": [7, "Tecnibo Belgium SA"]
        },
        {
          "id": 4578071,
          "partner_id": [3137, "BSH Home Appliances"],
          "product_tmpl_id": [998599, "[00492680] Charnière Siemens pour réfrigérateur encastrable"],
          "product_id": null,
          "min_qty": 2,
          "price": 41.45,
          "delay": 10,
          "sequence": 2,
          "company_id": [1, "Wood CAM SRL"]
        },
        {
          "id": 4584274,
          "partner_id": [3137, "BSH Home Appliances"],
          "product_tmpl_id": [998599, "[00492680] Charnière Siemens pour réfrigérateur encastrable"],
          "product_id": null,
          "min_qty": 2,
          "price": 40.25,
          "delay": 0,
          "sequence": 3,
          "company_id": [1, "Wood CAM SRL"]
        }
      ],
      "vendor_partner_ids": [1, 3137],
      "vendor_primary": {
        "id": 4578069,
        "partner_id": [1, "Wood CAM SRL"],
        "product_tmpl_id": [998599, "[00492680] Charnière Siemens pour réfrigérateur encastrable"],
        "product_id": null,
        "min_qty": 0,
        "price": 0,
        "delay": 14,
        "sequence": 1,
        "company_id": [4, "Tecnibo Lux SA"]
      },
      "stock": {
        "qty_available": 10,
        "free_qty": 10,
        "virtual_available": 10,
        "incoming_qty": 0,
        "outgoing_qty": 0
      }
    }
  ]
}
JSON




