# cancel_so.ps1
# Cancel a sale order by ID via Odoo RPC
# Usage: powershell -ExecutionPolicy Bypass -File cancel_so.ps1 -SoId 28279

param(
    [Parameter(Mandatory=$true)]
    [int]$SoId
)

$SESSION_ID = "5241b583388f86b8aa96965545574531fd55177f"
$ODOO_URL = "https://www.tecnibo.com/web/dataset/call_kw"

function Odoo-RPC($model, $method, $args) {
    $body = @{
        jsonrpc = "2.0"
        id      = 1
        method  = "call"
        params  = @{
            model  = $model
            method = $method
            args   = $args
            kwargs = @{ context = @{ lang = "en_US" } }
        }
    } | ConvertTo-Json -Depth 10

    $session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
    $cookie = New-Object System.Net.Cookie("session_id", $SESSION_ID, "/", "www.tecnibo.com")
    $session.Cookies.Add((New-Object System.Uri("https://www.tecnibo.com")), $cookie)

    $r = Invoke-WebRequest -Uri $ODOO_URL -Method POST -Body $body -ContentType "application/json" -WebSession $session -UseBasicParsing
    return ($r.Content | ConvertFrom-Json)
}

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  Cancelling SO id=$SoId" -ForegroundColor White
Write-Host "============================================================" -ForegroundColor Cyan

# 1. Read current state
Write-Host ""
Write-Host "Reading current state..." -ForegroundColor Yellow
$read = Odoo-RPC "sale.order" "read" @(,@($SoId), @("name","state"))
$so = $read.result[0]
Write-Host "  SO: $($so.name)  state: $($so.state)" -ForegroundColor White

if ($so.state -eq "cancel") {
    Write-Host "  Already cancelled!" -ForegroundColor Green
    exit 0
}

# 2. Unlock if confirmed
if ($so.state -eq "sale" -or $so.state -eq "done") {
    Write-Host "Unlocking..." -ForegroundColor Yellow
    $unlock = Odoo-RPC "sale.order" "action_unlock" @($SoId)
    if ($unlock.error) {
        Write-Host "  Unlock failed: $($unlock.error.data.message)" -ForegroundColor Red
    } else {
        Write-Host "  [OK] Unlocked" -ForegroundColor Green
    }
}

# 3. Force cancel via write
Write-Host "Cancelling..." -ForegroundColor Yellow
$cancel = Odoo-RPC "sale.order" "write" @(,@($SoId), @{ state = "cancel" })
if ($cancel.error) {
    Write-Host "  Cancel failed: $($cancel.error.data.message)" -ForegroundColor Red
    exit 1
} else {
    Write-Host "  [OK] Cancelled" -ForegroundColor Green
}

# 4. Verify
$verify = Odoo-RPC "sale.order" "read" @(,@($SoId), @("name","state"))
$final = $verify.result[0]
Write-Host ""
Write-Host "Final state: $($final.name) -> $($final.state)" -ForegroundColor $(if($final.state -eq "cancel"){"Green"}else{"Red"})
