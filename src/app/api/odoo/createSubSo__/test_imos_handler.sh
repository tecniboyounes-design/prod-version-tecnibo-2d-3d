#!/usr/bin/env bash
# test_imos_handler.sh
# Tests the IMOS XML generation by calling handleImosItems with two real IMOS products.
# Run from project root: ./src/app/api/odoo/createSubSo/test_imos_handler.sh
# Requires: node

echo "=== IMOS Handler Test ==="
echo ""

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../../../.." && pwd)"
echo "Project root: $PROJECT_ROOT"

TEMP_FILE="$PROJECT_ROOT/_temp_imos_test.mjs"

cat > "$TEMP_FILE" <<'JSEOF'
import { handleImosItems } from './src/app/api/odoo/createSubSo/lib/imosHandler.js';

const imosItems = [
    {
        id: 48,
        name: 'P_SUB_T100_LIN_CR_S1_90_A',
        imos_main_name: 'P_SUB_T100_LIN_CR_S1_90_A',
        imos_name: 'P_SUB_T100_LIN_CR_S1_90_A',
        display_name: 'P_SUB_T100_LIN_CR_S1_90_A',
        imos_descript_1: 'Subarticle A for T100 Corner Right Side 1 90 deg',
        imos_source: 't.bazylak',
        imos_sizex_real: 25000,
        imos_sizey_real: 102,
        imos_sizez_real: 3100,
        imos_table: 'articles',
        table_name: 'articles',
        markup: 40.0,
        article_qty: 77.5,
        uom_id: { id: 116, display_name: 'M2' },
        qty_operation: 'grps.imos_sizex_real*grps.imos_sizez_real/1000000',
        routing: 'imos',
        quantity: 3,
        price: 230.13,
        cfg_name: 'P_SUB_T100_LIN_CR_S1_90_A',
        product_variant_id: 48,
        dimensions: { width: 25000, depth: 102, height: 3100 },
        variables: {
            ART_SIZEX: 25000,
            ART_SIZEY: 102,
            ART_SIZEZ: 3100,
            mat_1_T100_category_combox: 'Decor Panel',
            mat_1_T100_thk_combox: '18',
            mat_1_T100_core_combox: 'UN_EV_551_CST_18mm',
        },
        articleDescription: {
            D_MOVABLE_SUPPLIER: { label: 'Fournisseur', value: 'Parthos' },
            P_HEIGHT: { label: 'Height', value: 3100 },
            P_WIDTH: { label: 'Width', value: 25000 },
        },
    },
    {
        id: 9,
        name: 'OLD_KIWC_NICHE',
        imos_main_name: 'OLD_KIWC_NICHE',
        imos_name: 'OLD_KIWC_NICHE',
        display_name: 'OLD_KIWC_NICHE',
        imos_descript_1: 'Kitchen wall cabinet niche',
        imos_source: 'o.abidlmerabetine',
        imos_sizex_real: 600,
        imos_sizey_real: 350,
        imos_sizez_real: 600,
        imos_table: 'articles',
        table_name: 'articles',
        markup: 65.0,
        article_qty: 1.0,
        uom_id: { id: 1, display_name: 'Unite(s)' },
        qty_operation: '1',
        routing: 'imos',
        quantity: 2,
        price: 441.47,
        cfg_name: 'OLD_KIWC_NICHE',
        product_variant_id: 9,
        dimensions: { width: 600, depth: 350, height: 600 },
        variables: {
            ART_SIZEX: 600,
            ART_SIZEY: 350,
            ART_SIZEZ: 600,
        },
        articleDescription: {
            P_HEIGHT: { label: 'Height', value: 600 },
            P_WIDTH: { label: 'Width', value: 600 },
            P_DEPTH: { label: 'Depth', value: 350 },
        },
    },
];

const result = handleImosItems(imosItems, {
    project_id: 1993,
    phase_id: 42,
    commitment_date: '2026-04-15',
    origin: 'O_TL_25_0165',
    partner_id: 803,
    client: 'm.perin@tecnibo.com',
    employee: 'Marie Laure PERIN',
});

console.log('\n=== RESULT ===');
console.log(JSON.stringify(result, null, 2));

if (result.xml_file) {
    console.log('\nSUCCESS: XML written to ' + result.xml_file);
} else {
    console.log('\nFAILED: No XML file created');
    process.exit(1);
}
JSEOF

echo "Running IMOS handler test..."
echo ""

cleanup() {
    [ -f "$TEMP_FILE" ] && rm -f "$TEMP_FILE"
}
trap cleanup EXIT

pushd "$PROJECT_ROOT" > /dev/null
node "$TEMP_FILE"
EXIT_CODE=$?
popd > /dev/null

echo ""
if [ $EXIT_CODE -eq 0 ]; then
    echo "TEST PASSED"

    OUTPUT_DIR="$PROJECT_ROOT/imos_output"
    if [ -d "$OUTPUT_DIR" ]; then
        echo ""
        echo "Generated XML files in imos_output/:"
        ls -t "$OUTPUT_DIR"/*.xml 2>/dev/null | head -3 | while read -r f; do
            echo "  $(basename "$f")  ($(wc -c < "$f") bytes)"
        done

        # Show content of the latest XML
        LATEST=$(ls -t "$OUTPUT_DIR"/*.xml 2>/dev/null | head -1)
        if [ -n "$LATEST" ]; then
            echo ""
            echo "=== Latest XML ($(basename "$LATEST")) ==="
            cat "$LATEST"
        fi
    fi
else
    echo "TEST FAILED (exit code: $EXIT_CODE)"
    exit $EXIT_CODE
fi
