# URL and Database
$url = "http://192.168.30.33:8069"
$db = "tecnibo17_test"  # Your database name

# User credentials (login and password)
$login = "y.attaoui@tecnibo.com"
$password = "Y5EhmP5BX-r9Fru"

# Step 1: Authenticate to get user ID (uid)
$authResponse = Invoke-WebRequest -Uri "$url/xmlrpc/2/common" -Method POST -Headers @{
    "Content-Type" = "application/json"
} -Body @{
    jsonrpc = "2.0"
    method  = "call"
    params  = @{
        db       = $db
        login    = $login
        password = $password
    }
    id = 1
} | ConvertFrom-Json

$uid = $authResponse.result.uid  # User ID
 

# Step 2: Call execute_kw to create a project

$createProjectBody = @{
    jsonrpc = "2.0"
    method  = "call"
    params  = @{
        model  = "project.project"  # Model for the project
        method = "create"           # Method to create a new record
        args   = @(
            @{
                name        = "New Project for Younes Attaoui"  # Project name
                description = "Description of the new project"  # Project description
                user_id     = $uid  # Use the authenticated user's ID
                partner_id  = 17909  # Partner ID (modify as needed)
            }
        )
        kwargs = @{}
    }
    id = 2
} | ConvertTo-Json

# Send the request to create the project
$createProjectResponse = Invoke-WebRequest -Uri "$url/xmlrpc/2/object" -Method POST -Headers @{
    "Content-Type" = "application/json"
} -Body $createProjectBody


# Output the response
$createProjectResponseJson = $createProjectResponse.Content | ConvertFrom-Json
Write-Output $createProjectResponseJson
