# after changing the email and password copy past script in Powershell and click enter 
$headers = @{
    "Content-Type" = "application/json"
}

$body = @{
    jsonrpc = "2.0"
    method  = "call"
    params  = @{
        db       = "tecnibo17_test"  
        login    = "y.attaoui@tecnibo.com"
        password = "Y5EhmP5BX-r9Fru"
    }
    id = 1
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://192.168.30.33:8069/web/session/authenticate" -Method POST -Headers $headers -Body $body
