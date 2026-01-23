curl -sS -X POST "http://localhost:3009/api/cloudflare/folders" \
  -H "Content-Type: application/json" \
  -b "cf_upload_gate=ok%3A1767010835109.94498f4fa7288bad7e091a41cd879fc86f4add87ac2753683ca88a749f6e1e94" \
  -d '{"path":"testempthy","createdBy":"cloudflare-ui"}' | jq
