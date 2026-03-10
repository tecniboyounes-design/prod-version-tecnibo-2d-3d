# test_createSubSo.ps1
# Tests the createSubSo endpoint with a MIXED payload (odoo + imos items)
# - 3 odoo items: real products from odooimoscondesclog/1770118183730.json
# - 2 imos items: pure IMOS articles (P_SUB_T100_LIN_CR_S1_90_A, OLD_KIWC_NICHE)
#
# Usage:
#   powershell -ExecutionPolicy Bypass -File test_createSubSo.ps1

param(
    [string]$BaseUrl = "http://localhost:3009",
    [string]$SessionId = "5241b583388f86b8aa96965545574531fd55177f"
)

$endpoint = "$BaseUrl/api/odoo/createSubSo"

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  Testing POST $endpoint" -ForegroundColor White
Write-Host "============================================================" -ForegroundColor Cyan

# ── Payload with mixed routing: 3 odoo + 2 imos ──────────────
$payload = @{
    project_id      = 3317
    phase_id        = 42
    commitment_date = "2026-04-15"
    company_id      = 4
    confirm         = $true
    sub_so          = $true
    origin          = "SO/TL/2026/2232"
    client          = "m.perin@tecnibo.com"
    employee        = "Marie Laure PERIN"
    debug           = $true
    items           = @(
        # ── Odoo item 1: Colle silicone (from 1770118183730.json) ──
        @{
            id                 = 11581
            name               = "Promante 15473 Constru-Fix cartouche 290ml"
            default_code       = "15473"
            imos_table         = "imos.conndesc"
            imos_name          = "TUB_COL_SILIC_FORTE"
            ref_imos           = "15473"
            product_variant_id = 11291
            routing            = "odoo"
            quantity           = 5
            price              = 12.50
        },
        # ── Odoo item 2: Lamello bois (from 1770118183730.json) ──
        @{
            id                 = 2903
            name               = "Lamello bois taille 20"
            default_code       = "144020"
            imos_table         = "imos.conndesc"
            imos_name          = "w_lamello_20mm_rainure100mm"
            ref_imos           = "144020"
            product_variant_id = 2903
            routing            = "odoo"
            quantity           = 100
            price              = 0.15
        },
        # ── Odoo item 3: Cheville compacte (from 1770118183730.json) ──
        @{
            id                 = 28232
            name               = "Cheville compacte HKD M6X25"
            default_code       = "376894"
            imos_table         = "imos.conndesc"
            imos_name          = "A_HKD_M6X25"
            ref_imos           = "376894"
            product_variant_id = 24667
            routing            = "odoo"
            quantity           = 50
            price              = 0.45
        },
        # ── IMOS item 1: T100 Panel (pure IMOS article) ──
        @{
            id                 = 48
            name               = "P_SUB_T100_LIN_CR_S1_90_A"
            imos_name          = "P_SUB_T100_LIN_CR_S1_90_A"
            cfg_name           = "P_SUB_T100_LIN_CR_S1_90_A"
            imos_table         = "articles"
            product_variant_id = 48
            routing            = "imos"
            quantity           = 3
            price              = 230.13
            dimensions         = @{ width = 25000; depth = 102; height = 3100 }
            variables          = @{
                ART_SIZEX                  = 25000
                ART_SIZEY                  = 102
                ART_SIZEZ                  = 3100
                mat_1_T100_category_combox = "Decor Panel"
                mat_1_T100_thk_combox      = "18"
                mat_1_T100_core_combox     = "UN_EV_551_CST_18mm"
            }
            articleDescription = @{
                D_MOVABLE_SUPPLIER = @{ label = "Fournisseur"; value = "Parthos" }
                P_HEIGHT           = @{ label = "Height"; value = 3100 }
                P_WIDTH            = @{ label = "Width"; value = 25000 }
            }
        },
        # ── IMOS item 2: Kitchen wall cabinet niche (pure IMOS article) ──
        @{
            id                 = 9
            name               = "OLD_KIWC_NICHE"
            imos_name          = "OLD_KIWC_NICHE"
            cfg_name           = "OLD_KIWC_NICHE"
            imos_table         = "articles"
            product_variant_id = 9
            routing            = "imos"
            quantity           = 2
            price              = 441.47
            dimensions         = @{ width = 600; depth = 350; height = 600 }
            variables          = @{
                ART_SIZEX = 600
                ART_SIZEY = 350
                ART_SIZEZ = 600
            }
            articleDescription = @{
                P_HEIGHT = @{ label = "Height"; value = 600 }
                P_WIDTH  = @{ label = "Width"; value = 600 }
                P_DEPTH  = @{ label = "Depth"; value = 350 }
            }
        }
    )
} | ConvertTo-Json -Depth 10

Write-Host ""
Write-Host "Payload size: $($payload.Length) bytes" -ForegroundColor Yellow
Write-Host "Items: 3 odoo (conndesc) + 2 imos (articles) = mixed route" -ForegroundColor Yellow
Write-Host ""

try {
    # Build cookie container
    $session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
    $cookie = New-Object System.Net.Cookie("session_id", $SessionId, "/", "localhost")
    $session.Cookies.Add((New-Object System.Uri($BaseUrl)), $cookie)

    $response = Invoke-WebRequest `
        -Uri $endpoint `
        -Method POST `
        -Body $payload `
        -ContentType "application/json" `
        -WebSession $session `
        -UseBasicParsing `
        -TimeoutSec 60

    Write-Host "Status: $($response.StatusCode)" -ForegroundColor Green
    Write-Host ""
    Write-Host "Response:" -ForegroundColor Cyan
    $response.Content | ConvertFrom-Json | ConvertTo-Json -Depth 10
} catch {
    $err = $_.Exception
    if ($err.Response) {
        $statusCode = [int]$err.Response.StatusCode
        $reader = New-Object System.IO.StreamReader($err.Response.GetResponseStream())
        $body = $reader.ReadToEnd()
        Write-Host "Status: $statusCode" -ForegroundColor Red
        Write-Host ""
        Write-Host "Error Response:" -ForegroundColor Red
        try { $body | ConvertFrom-Json | ConvertTo-Json -Depth 5 } catch { $body }
    } else {
        Write-Host "Connection failed: $($err.Message)" -ForegroundColor Red
    }
}
