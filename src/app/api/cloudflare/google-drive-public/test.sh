curl -sS -X POST "http://192.168.30.92:3009/api/cloudflare/google-drive-public" \
  -H "Content-Type: application/json" \
  -d '{
    "url":"https://drive.google.com/drive/folders/1TQwKL07vQ7VX-Pnb2V-UHczhoVJlmhQy?usp=sharing",
    "mode":"gdown",
    "action":"import",
    "targetFolder":"cloudflare7",
    "cleanup":true,
    "debug":true
  }' | jq .




curl -sS "http://192.168.30.92:3009/api/cloudflare/fs" | jq .
