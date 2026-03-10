#!/usr/bin/env bash
# test_createSubSo.sh
# Tests the createSubSo endpoint with a MIXED payload (odoo + imos items)
# - 3 odoo items: real products from odooimoscondesclog/1770118183730.json
# - 2 imos items: pure IMOS articles (P_SUB_T100_LIN_CR_S1_90_A, OLD_KIWC_NICHE)
#
# Usage:
#   ./test_createSubSo.sh [BASE_URL] [SESSION_ID]
# Requires: curl, jq

BASE_URL="${1:-http://localhost:3009}"
SESSION_ID="${2:-abde6887118106d27a53a78962ccf830d088d210}"
ENDPOINT="$BASE_URL/api/odoo/createSubSo"

echo "============================================================"
echo "  Testing POST $ENDPOINT"
echo "============================================================"

# ── Payload with mixed routing: 3 odoo + 2 imos ──────────────
PAYLOAD=$(cat <<'EOF'
{
    "project_id": 3317,
    "phase_id": 42,
    "commitment_date": "2026-04-15",
    "company_id": 4,
    "confirm": true,
    "sub_so": true,
    "debug": true,
    "items": [
        {
            "id": 11581,
            "name": "Promante 15473 Constru-Fix cartouche 290ml",
            "default_code": "15473",
            "imos_table": "imos.conndesc",
            "imos_name": "TUB_COL_SILIC_FORTE",
            "ref_imos": "15473",
            "product_variant_id": 11291,
            "routing": "odoo",
            "quantity": 5,
            "price": 12.50
        },
        {
            "id": 2903,
            "name": "Lamello bois taille 20",
            "default_code": "144020",
            "imos_table": "imos.conndesc",
            "imos_name": "w_lamello_20mm_rainure100mm",
            "ref_imos": "144020",
            "product_variant_id": 2903,
            "routing": "odoo",
            "quantity": 100,
            "price": 0.15
        },
        {
            "id": 28232,
            "name": "Cheville compacte HKD M6X25",
            "default_code": "376894",
            "imos_table": "imos.conndesc",
            "imos_name": "A_HKD_M6X25",
            "ref_imos": "376894",
            "product_variant_id": 24667,
            "routing": "odoo",
            "quantity": 50,
            "price": 0.45
        },
        {
            "id": 48,
            "name": "P_SUB_T100_LIN_CR_S1_90_A",
            "imos_name": "P_SUB_T100_LIN_CR_S1_90_A",
            "cfg_name": "P_SUB_T100_LIN_CR_S1_90_A",
            "imos_table": "articles",
            "product_variant_id": 48,
            "routing": "imos",
            "quantity": 3,
            "price": 230.13,
            "dimensions": { "width": 25000, "depth": 102, "height": 3100 },
            "variables": {
                "ART_SIZEX": 25000,
                "ART_SIZEY": 102,
                "ART_SIZEZ": 3100,
                "mat_1_T100_category_combox": "Decor Panel",
                "mat_1_T100_thk_combox": "18",
                "mat_1_T100_core_combox": "UN_EV_551_CST_18mm"
            },
            "articleDescription": {
                "D_MOVABLE_SUPPLIER": { "label": "Fournisseur", "value": "Parthos" },
                "P_HEIGHT": { "label": "Height", "value": 3100 },
                "P_WIDTH": { "label": "Width", "value": 25000 }
            }
        },
        {
            "id": 9,
            "name": "OLD_KIWC_NICHE",
            "imos_name": "OLD_KIWC_NICHE",
            "cfg_name": "OLD_KIWC_NICHE",
            "imos_table": "articles",
            "product_variant_id": 9,
            "routing": "imos",
            "quantity": 2,
            "price": 441.47,
            "dimensions": { "width": 600, "depth": 350, "height": 600 },
            "variables": {
                "ART_SIZEX": 600,
                "ART_SIZEY": 350,
                "ART_SIZEZ": 600
            },
            "articleDescription": {
                "P_HEIGHT": { "label": "Height", "value": 600 },
                "P_WIDTH": { "label": "Width", "value": 600 },
                "P_DEPTH": { "label": "Depth", "value": 350 }
            }
        }
    ]
}
EOF
)

echo ""
echo "Payload size: ${#PAYLOAD} bytes"
echo "Items: 3 odoo (conndesc) + 2 imos (articles) = mixed route"
echo ""

RESPONSE_FILE=$(mktemp /tmp/createSubSo_response.XXXXXX.json)
trap 'rm -f "$RESPONSE_FILE"' EXIT

HTTP_CODE=$(curl -s -o "$RESPONSE_FILE" -w "%{http_code}" \
    -X POST "$ENDPOINT" \
    -H "Content-Type: application/json" \
    -H "Cookie: session_id=$SESSION_ID" \
    --max-time 60 \
    -d "$PAYLOAD")

if [ "$HTTP_CODE" -ge 200 ] && [ "$HTTP_CODE" -lt 300 ]; then
    echo "Status: $HTTP_CODE"
    echo ""
    echo "Response:"
    jq '.' "$RESPONSE_FILE"
else
    echo "Status: $HTTP_CODE"
    echo ""
    echo "Error Response:"
    jq '.' "$RESPONSE_FILE" 2>/dev/null || cat "$RESPONSE_FILE"
    exit 1
fi
