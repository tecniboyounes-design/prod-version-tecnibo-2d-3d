#!/usr/bin/env bash
set -euo pipefail

log() { echo "[bulk-upload] $*" >&2; }

API_BASE="${API_BASE:-http://127.0.0.1:3009}"
DIR="${DIR:-}"
TARGET="${TARGET:-}"

# Cloudflare API creds (use same env as backend)
CF_ACCOUNT_ID="${CLOUDFLARE_ACCOUNT_ID:-${CF_ACCOUNT_ID:-}}"
CF_TOKEN="${CLOUDFLARE_IMAGES_TOKEN:-${CLOUDFLARE_API_TOKEN:-${CF_IMAGES_TOKEN:-}}}"

# Gate secret (same as your backend expects)
CF_UPLOAD_TOKEN="${CF_UPLOAD_TOKEN:-}"

if [[ -z "${DIR}" ]]; then
  echo "Missing DIR env. Example: DIR=/path/to/images" >&2
  exit 2
fi

if [[ -z "${TARGET}" ]]; then
  echo "Missing TARGET env. Example: TARGET=copy_2" >&2
  exit 2
fi

if [[ ! -d "${DIR}" ]]; then
  echo "DIR does not exist or is not a directory: ${DIR}" >&2
  exit 2
fi

if [[ -z "${CF_ACCOUNT_ID}" ]]; then
  echo "Missing CLOUDFLARE_ACCOUNT_ID (or CF_ACCOUNT_ID) in env." >&2
  exit 2
fi

if [[ -z "${CF_TOKEN}" ]]; then
  echo "Missing CLOUDFLARE_IMAGES_TOKEN (or CLOUDFLARE_API_TOKEN / CF_IMAGES_TOKEN) in env." >&2
  exit 2
fi

if [[ -z "${CF_UPLOAD_TOKEN}" ]]; then
  echo "Missing CF_UPLOAD_TOKEN in env (needed for /commit-upload gate cookie)." >&2
  exit 2
fi

# Build cf_upload_gate cookie value exactly like your backend (hmac ok:<ts>)
CF_UPLOAD_COOKIE="$(
node - <<'NODE'
const crypto = require('crypto');
const secret = process.env.CF_UPLOAD_TOKEN || '';
const msg = `ok:${Date.now()}`;
const sig = crypto.createHmac('sha256', secret).update(msg).digest('hex');
process.stdout.write(`${msg}.${sig}`);
NODE
)"

# Helpers
normpath() {
  # remove leading/trailing slashes and collapse multiple slashes
  python3 - "$1" <<'PY'
import re, sys
p = (sys.argv[1] or "").strip()
p = re.sub(r'^/+|/+$', '', p)
p = re.sub(r'/+', '/', p)
print(p)
PY
}

guess_mime() {
  local f="$1"
  if command -v file >/dev/null 2>&1; then
    file --mime-type -b "$f" 2>/dev/null || echo "application/octet-stream"
  else
    echo "application/octet-stream"
  fi
}

json_get() {
  # usage: json_get '<json>' 'python_expr_returning_value'
  python3 - "$1" "$2" <<'PY'
import json, sys
obj = json.loads(sys.argv[1])
expr = sys.argv[2]
# expose obj as "j"
j = obj
try:
  v = eval(expr, {"j": j})
except Exception:
  v = None
if v is None:
  print("")
else:
  print(v)
PY
}

make_expiry_iso() {
  # 30 minutes from now
  python3 - <<'PY'
from datetime import datetime, timedelta, timezone
print((datetime.now(timezone.utc) + timedelta(minutes=30)).isoformat().replace('+00:00', 'Z'))
PY
}

rand_suffix() {
  python3 - <<'PY'
import uuid
print(str(uuid.uuid4())[:8])
PY
}

# Cloudflare: create direct upload URL (retry if id already exists)
create_direct_upload() {
  local cfid="$1"
  local expiry
  expiry="$(make_expiry_iso)"

  local res
  res="$(curl -sS -X POST \
    "https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/images/v2/direct_upload" \
    -H "Authorization: Bearer ${CF_TOKEN}" \
    -H "Accept: application/json" \
    -F "id=${cfid}" \
    -F "requireSignedURLs=false" \
    -F "expiry=${expiry}" \
  )" || return 1

  local success
  success="$(json_get "$res" 'j.get("success")')"

  if [[ "$success" != "True" && "$success" != "true" ]]; then
    local code msg
    code="$(json_get "$res" '((j.get("errors") or [{}])[0] or {}).get("code")')"
    msg="$(json_get "$res" '((j.get("errors") or [{}])[0] or {}).get("message")')"
    # 5409 => already exists
    if [[ "$code" == "5409" ]]; then
      local sfx nextid
      sfx="$(rand_suffix)"
      nextid="${cfid}__${sfx}"
      log "CF id exists (5409). Retrying with suffix: ${nextid}"
      create_direct_upload "$nextid"
      return 0
    fi
    log "Cloudflare direct_upload failed: code=${code} msg=${msg}"
    return 1
  fi

  echo "$res"
}

# Cloudflare: upload file to direct upload URL
upload_to_cf() {
  local upload_url="$1"
  local file_path="$2"
  curl -sS -X POST "$upload_url" \
    -H "Accept: application/json" \
    -F "file=@${file_path}" >/dev/null
}

# Backend: commit metadata to DB
commit_to_db() {
  local cf_image_id="$1"
  local size_bytes="$2"
  local mime="$3"

  curl -sS -X POST \
    "${API_BASE}/api/cloudflare/commit-upload" \
    -H "Content-Type: application/json" \
    -H "Cookie: cf_upload_gate=${CF_UPLOAD_COOKIE}" \
    --data "$(python3 - <<PY
import json
print(json.dumps({
  "cf_image_id": "${cf_image_id}",
  "sizeBytes": int(${size_bytes}),
  "mimeType": "${mime}",
  "width": None,
  "height": None
}))
PY
)" >/dev/null
}

TARGET_NORM="$(normpath "$TARGET")"

log "DIR=${DIR}"
log "TARGET=${TARGET_NORM}"
log "API_BASE=${API_BASE}"
log "Uploading files one-by-one to avoid 413/timeouts..."

# Only common image extensions (adjust if needed)
mapfile -t FILES < <(find "$DIR" -maxdepth 1 -type f \( \
  -iname "*.jpg" -o -iname "*.jpeg" -o -iname "*.png" -o -iname "*.webp" -o -iname "*.avif" -o -iname "*.gif" -o -iname "*.bmp" -o -iname "*.tif" -o -iname "*.tiff" -o -iname "*.svg" -o -iname "*.jfif" -o -iname "*.heic" -o -iname "*.heif" \
\) | sort)

if [[ "${#FILES[@]}" -eq 0 ]]; then
  log "No image files found in ${DIR}"
  exit 0
fi

log "Found ${#FILES[@]} files."

ok_count=0
fail_count=0

for f in "${FILES[@]}"; do
  base="$(basename "$f")"
  cfid="${TARGET_NORM}/${base}"

  size_bytes="$(stat -c%s "$f" 2>/dev/null || echo 0)"
  mime="$(guess_mime "$f")"

  log "→ ${base} (${size_bytes} bytes, ${mime})"

  if res="$(create_direct_upload "$cfid")"; then
    upload_url="$(json_get "$res" '(((j.get("result") or {}) ).get("uploadURL"))')"
    real_id="$(json_get "$res" '(((j.get("result") or {}) ).get("id"))')"

    if [[ -z "$upload_url" || -z "$real_id" ]]; then
      log "✗ Missing uploadURL/id from CF response for ${base}"
      fail_count=$((fail_count+1))
      continue
    fi

    if upload_to_cf "$upload_url" "$f"; then
      # Commit the exact id CF returns (could include suffix)
      if commit_to_db "$real_id" "$size_bytes" "$mime"; then
        ok_count=$((ok_count+1))
        log "✓ Uploaded + committed: ${real_id}"
      else
        fail_count=$((fail_count+1))
        log "✗ Commit failed for: ${real_id}"
      fi
    else
      fail_count=$((fail_count+1))
      log "✗ Upload failed for: ${real_id}"
    fi
  else
    fail_count=$((fail_count+1))
    log "✗ Direct upload create failed for ${base}"
  fi
done

log "DONE ok=${ok_count} fail=${fail_count}"







