#!/usr/bin/env bash
set -euo pipefail

URL="$1"
OUTDIR="$2"

log() {
  echo "[gdrive-public][scrap][$(date -Is)] $*" >&2
}

json_fail() {
  python3 - <<PY
import json
print(json.dumps({"ok": False, "message": "Download failed"}))
PY
  exit 1
}

# ---- Validation ----
if [[ -z "$URL" || -z "$OUTDIR" ]]; then
  json_fail
fi

mkdir -p "$OUTDIR"

log "START"
log "URL=$URL"
log "OUTDIR=$OUTDIR"

log "Running gdown folder download (best-effort). Output -> $OUTDIR/.gdown.log"

# ---- IMPORTANT ----
# --remaining-ok : continue even if some files are blocked
# --no-cookies   : avoid Google Drive anti-bot cookie traps
# || true        : never crash API route
gdown \
  --folder \
  --remaining-ok \
  --no-cookies \
  "$URL" \
  -O "$OUTDIR" \
  >"$OUTDIR/.gdown.log" 2>&1 || true

# ---- Debug visibility (safe for prod, logs only) ----
log "Scanning downloaded files..."
log "Directory tree (files only):"
find "$OUTDIR" -type f ! -name ".*" -maxdepth 6 >&2 || true




# ---- Emit JSON payload to stdout (ONLY JSON) ----
python3 - <<'PY'
import os, json

out = os.environ.get("OUTDIR", "")
items = []

for root, dirs, files in os.walk(out):
    for f in files:
        if f.startswith("."):
            continue
        p = os.path.join(root, f)
        rel = os.path.relpath(p, out)
        items.append(rel)

print(json.dumps({
    "ok": True,
    "downloadedCount": len(items),
    "items": items
}))
PY

log "DONE (JSON written to stdout)"
