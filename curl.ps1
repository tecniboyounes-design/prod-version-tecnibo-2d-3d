# Update the email and password before running!

$headers = @{
    "Content-Type" = "application/json"
}

$body = @{
    jsonrpc = "2.0"
    method  = "call"
    params  = @{
        db       = "tecnibo17_test"
        login    = "y.attaoui@tecnibo.com"  # Change this to your email
        password = "Y5EhmP5BX-r9Fru"        # Change this to your password
    }
    id = 1
} | ConvertTo-Json -Depth 10  # Convert body to JSON format

# Send the request
$response = Invoke-WebRequest -Uri "http://192.168.30.33:8069/web/session/authenticate" -Method POST -Headers $headers -Body $body

# Convert the response content to JSON and pretty print it
$prettyJson = $response.Content | ConvertFrom-Json | ConvertTo-Json -Depth 10 

# Display response in console in a readable format
Write-Output "`n====== Response Start ======`n"
Write-Output $prettyJson
Write-Output "`n====== Response End ======`n"

# Save response to a log file with timestamp
$timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$logPath = "C:\Users\Huawei\Desktop\response_$timestamp.json"
$prettyJson | Out-File -FilePath $logPath

# Notify user where the log is saved
Write-Output "`n📌 Response saved to: $logPath"






# Headers for the request
$headers = @{
    "Content-Type" = "application/json"
}

# Define the session ID for authentication (from the previous response)
$session_id = "your_session_id_here"  # Make sure to use the correct session ID from the response

# Prepare the body for creating a new project related to you (Younes Attaoui, uid: 447)
$projectBody = @{
    jsonrpc = "2.0"
    method  = "call"
    params  = @{
        model  = "project.project"  # Model for project
        method = "create"  # Method to create a new record
        args   = @(
            @{
                name        = "New Project for Younes Attaoui"
                description = "Description of the new project"
                user_id     = 447  # Use your user ID (uid: 447 from the response)
                partner_id  = 17909  # Use your partner ID (partner_id: 17909 from the response)
            }
        )
        kwargs = @{}
    }
    id = 2
} | ConvertTo-Json

# Send the request to create the project
$response = Invoke-WebRequest -Uri "http://192.168.30.33:8069/web/dataset/call_kw" -Method POST -Headers $headers -Body $projectBody

# Display the response to check if the project was created successfully
$response.Content
