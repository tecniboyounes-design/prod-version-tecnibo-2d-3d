# test_imos_handler.ps1
# Tests the IMOS XML generation by calling handleImosItems with two real IMOS products.
# Run from project root: powershell -ExecutionPolicy Bypass -File .\src\app\api\odoo\createSubSo\test_imos_handler.ps1

Write-Host "=== IMOS Handler Test ===" -ForegroundColor Cyan
Write-Host ""

$projectRoot = Resolve-Path "$PSScriptRoot\..\..\..\..\..\"
Write-Host "Project root: $projectRoot"

# Run the test script (test_imos.mjs at project root)
$testScript = @"
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
"@

# Write temp test file
$tempFile = Join-Path $projectRoot "_temp_imos_test.mjs"
Set-Content -Path $tempFile -Value $testScript -Encoding UTF8

Write-Host "Running IMOS handler test..." -ForegroundColor Yellow
Write-Host ""

try {
    Push-Location $projectRoot
    $output = & node $tempFile 2>&1
    $exitCode = $LASTEXITCODE

    # Display output
    $output | ForEach-Object { Write-Host $_ }

    Write-Host ""
    if ($exitCode -eq 0) {
        Write-Host "TEST PASSED" -ForegroundColor Green

        # Show generated XML files
        $outputDir = Join-Path $projectRoot "imos_output"
        if (Test-Path $outputDir) {
            Write-Host ""
            Write-Host "Generated XML files in imos_output/:" -ForegroundColor Cyan
            Get-ChildItem $outputDir -Filter "*.xml" | Sort-Object LastWriteTime -Descending | Select-Object -First 3 | ForEach-Object {
                Write-Host "  $($_.Name)  ($($_.Length) bytes)" -ForegroundColor Green
            }

            # Show content of the latest XML
            $latest = Get-ChildItem $outputDir -Filter "*.xml" | Sort-Object LastWriteTime -Descending | Select-Object -First 1
            if ($latest) {
                Write-Host ""
                Write-Host "=== Latest XML ($($latest.Name)) ===" -ForegroundColor Cyan
                Get-Content $latest.FullName | Write-Host
            }
        }
    } else {
        Write-Host "TEST FAILED (exit code: $exitCode)" -ForegroundColor Red
    }
} finally {
    Pop-Location
    # Clean up temp file
    if (Test-Path $tempFile) {
        Remove-Item $tempFile -Force
    }
}
