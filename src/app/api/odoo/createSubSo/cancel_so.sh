#!/usr/bin/env bash
# cancel_so.sh
# Cancel a sale order by ID via Odoo RPC
# Usage: ./cancel_so.sh <SO_ID>
# Requires: curl, jq

if [ $# -lt 1 ]; then
    echo "Usage: $0 <SO_ID>"
    exit 1
fi

SO_ID="$1"
SESSION_ID="abde6887118106d27a53a78962ccf830d088d210"
ODOO_URL="https://www.tecnibo.com/web/dataset/call_kw"

odoo_rpc() {
    local model="$1"
    local method="$2"
    local args="$3"

    local body
    body=$(jq -n \
        --arg model "$model" \
        --arg method "$method" \
        --argjson args "$args" \
        '{
            jsonrpc: "2.0",
            id: 1,
            method: "call",
            params: {
                model: $model,
                method: $method,
                args: $args,
                kwargs: { context: { lang: "en_US" } }
            }
        }')

    curl -s -X POST "$ODOO_URL" \
        -H "Content-Type: application/json" \
        -H "Cookie: session_id=$SESSION_ID" \
        -d "$body"
}

echo "============================================================"
echo "  Cancelling SO id=$SO_ID"
echo "============================================================"

# 1. Read current state
echo ""
echo "Reading current state..."
read_result=$(odoo_rpc "sale.order" "read" "[[${SO_ID}], [\"name\", \"state\"]]")
so_name=$(echo "$read_result" | jq -r '.result[0].name')
so_state=$(echo "$read_result" | jq -r '.result[0].state')
echo "  SO: $so_name  state: $so_state"

if [ "$so_state" = "cancel" ]; then
    echo "  Already cancelled!"
    exit 0
fi

# 2. Unlock if confirmed
if [ "$so_state" = "sale" ] || [ "$so_state" = "done" ]; then
    echo "Unlocking..."
    unlock_result=$(odoo_rpc "sale.order" "action_unlock" "[${SO_ID}]")
    unlock_error=$(echo "$unlock_result" | jq -r '.error.data.message // empty')
    if [ -n "$unlock_error" ]; then
        echo "  Unlock failed: $unlock_error"
    else
        echo "  [OK] Unlocked"
    fi
fi

# 3. Force cancel via write
echo "Cancelling..."
cancel_result=$(odoo_rpc "sale.order" "write" "[[${SO_ID}], {\"state\": \"cancel\"}]")
cancel_error=$(echo "$cancel_result" | jq -r '.error.data.message // empty')
if [ -n "$cancel_error" ]; then
    echo "  Cancel failed: $cancel_error"
    exit 1
else
    echo "  [OK] Cancelled"
fi

# 4. Verify
verify_result=$(odoo_rpc "sale.order" "read" "[[${SO_ID}], [\"name\", \"state\"]]")
final_name=$(echo "$verify_result" | jq -r '.result[0].name')
final_state=$(echo "$verify_result" | jq -r '.result[0].state')
echo ""
echo "Final state: $final_name -> $final_state"
