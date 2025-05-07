
Invoke-RestMethod -Uri "http://localhost:3000/api/odoo/sync-material-price" `
  -Method Post `
  -Headers @{
    "Authorization" = "Bearer a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6"
    "Content-Type" = "application/json"
  } `
  -Body '{"name": "UN_DE_HGW_MDFBL_0L100_SA1_18", "price": 92}' `
  -Verbose