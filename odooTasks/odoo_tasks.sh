#!/usr/bin/env bash
set -euo pipefail

# ========= CONFIG (override via env vars) =========
ODOO_BASE="${ODOO_BASE:-https://www.tecnibo.com}"
DB="${ODOO_DB:-tecnibo}"
LOGIN="${ODOO_LOGIN:-y.attaoui@tecnibo.com}"
PASSWORD="${ODOO_PASSWORD:-Y5EhmP5BX-r9Fru}"           
COMPANY_ID="${ODOO_COMPANY_ID:-11}"

MODE="${MODE:-related}"                        # related | tree
ROOT_TASK_ID="${ROOT_TASK_ID:-258507}"
TARGET_UID="${ODOO_UID:-}"                     # optional; defaults to authenticated uid
PAGE_SIZE="${PAGE_SIZE:-200}"                  # pagination size for search_read
EXPAND_PROJECT_TASKS="${EXPAND_PROJECT_TASKS:-1}"  # 1 => fetch all tasks in related projects
RELATED_DOMAIN_JSON="${RELATED_DOMAIN_JSON:-}" # optional raw JSON domain for project.task

if [[ "$MODE" == "tree" ]]; then
  DEFAULT_OUT_JSON="./task-tree-${ROOT_TASK_ID}.json"
else
  DEFAULT_OUT_JSON="./odoo-related-tasks.json"
fi
OUT_JSON="${OUT_JSON:-$DEFAULT_OUT_JSON}"

COOKIE_JAR="${COOKIE_JAR:-$HOME/.odoo_cookie_tecnibo.txt}"

AUTH_URL="$ODOO_BASE/web/session/authenticate"
CALL_KW="$ODOO_BASE/web/dataset/call_kw"
CALL_PATH="$ODOO_BASE/web/dataset/call_kw"

TASK_FIELDS_JSON='["id","name","state","stage_id","project_id","parent_id","child_ids","user_ids","manager_id","create_uid","create_date","write_date","date_start","date_end","allocated_hours","remaining_hours","description_text"]'

# ========= sanity checks =========
need() { command -v "$1" >/dev/null 2>&1 || { echo "Missing dependency: $1"; exit 1; }; }
need curl
need jq

if [[ -z "$PASSWORD" ]]; then
  echo "Missing ODOO_PASSWORD. Example:"
  echo "  export ODOO_PASSWORD='...'"
  exit 1
fi
if ! [[ "$PAGE_SIZE" =~ ^[0-9]+$ ]] || (( PAGE_SIZE <= 0 )); then
  echo "PAGE_SIZE must be a positive integer. Got: $PAGE_SIZE"
  exit 1
fi
if [[ -n "$COMPANY_ID" ]] && ! [[ "$COMPANY_ID" =~ ^[0-9]+$ ]]; then
  echo "ODOO_COMPANY_ID must be numeric. Got: $COMPANY_ID"
  exit 1
fi

# ========= helpers =========
die() {
  echo "[error] $*" >&2
  exit 1
}

json_arr_push() {
  local arr="$1"
  local item="$2"
  jq -cn --argjson arr "$arr" --argjson item "$item" '$arr + [$item]'
}

ensure_ok() {
  local response="$1"
  local label="$2"
  if [[ "$(echo "$response" | jq -r 'has("error")')" == "true" ]]; then
    echo "[rpc-error] $label failed:" >&2
    echo "$response" | jq '.' >&2
    exit 1
  fi
}

AUTH_UID=""
ALLOWED_COMPANY_IDS_JSON="[]"
CONTEXT_JSON='{}'
TASK_FIELD_NAMES_JSON='[]'

# Authenticate and save session cookies to COOKIE_JAR
auth() {
  echo "[auth] logging in as $LOGIN ..."
  local auth_res
  auth_res="$(
    curl -sS \
    -c "$COOKIE_JAR" \
    -H 'Content-Type: application/json' \
    --data-raw "{
      \"jsonrpc\":\"2.0\",
      \"id\":1,
      \"method\":\"call\",
      \"params\":{
        \"db\":\"$DB\",
        \"login\":\"$LOGIN\",
        \"password\":\"$PASSWORD\"
      }
    }" \
    "$AUTH_URL"
  )"

  ensure_ok "$auth_res" "session/authenticate"

  AUTH_UID="$(echo "$auth_res" | jq -r '.result.uid // empty')"
  [[ -n "$AUTH_UID" ]] || die "Could not resolve authenticated uid from Odoo response."

  ALLOWED_COMPANY_IDS_JSON="$(echo "$auth_res" | jq -c '.result.user_context.allowed_company_ids // []')"
  if [[ "$ALLOWED_COMPANY_IDS_JSON" == "[]" ]] && [[ -n "${COMPANY_ID:-}" ]]; then
    ALLOWED_COMPANY_IDS_JSON="$(jq -cn --argjson cid "$COMPANY_ID" '[$cid]')"
  fi

  local user_ctx
  user_ctx="$(echo "$auth_res" | jq -c '.result.user_context // {}')"
  CONTEXT_JSON="$(jq -cn --argjson uc "$user_ctx" --argjson allowed "$ALLOWED_COMPANY_IDS_JSON" '$uc + {allowed_company_ids: $allowed}')"

  if [[ -z "$TARGET_UID" ]]; then
    TARGET_UID="$AUTH_UID"
  fi
  if ! [[ "$TARGET_UID" =~ ^[0-9]+$ ]]; then
    die "TARGET_UID/ODOO_UID must be numeric. Got: $TARGET_UID"
  fi

  echo "[auth] uid=$AUTH_UID target_uid=$TARGET_UID allowed_company_ids=$ALLOWED_COMPANY_IDS_JSON" >&2
}

rpc_call() {
  local model="$1"
  local method="$2"
  local args_json="${3:-[]}"
  local kwargs_json="${4:-{}}"

  local payload
  payload="$(
    jq -cn \
      --arg model "$model" \
      --arg method "$method" \
      --argjson args "$args_json" \
      --argjson kwargs "$kwargs_json" \
      '{jsonrpc:"2.0",id:1,method:"call",params:{model:$model,method:$method,args:$args,kwargs:$kwargs}}'
  )"

  curl -sS \
    -b "$COOKIE_JAR" \
    -H 'Content-Type: application/json' \
    --data-raw "$payload" \
    "$CALL_PATH/$model/$method"
}

load_task_field_names() {
  local kwargs_json
  kwargs_json="$(jq -cn --argjson ctx "$CONTEXT_JSON" '{context:$ctx}')"
  local res
  res="$(rpc_call "project.task" "fields_get" "[]" "$kwargs_json")"
  ensure_ok "$res" "project.task/fields_get"
  TASK_FIELD_NAMES_JSON="$(echo "$res" | jq -c '.result | keys')"
}

has_task_field() {
  local field="$1"
  jq -e --arg field "$field" 'index($field) != null' <<< "$TASK_FIELD_NAMES_JSON" >/dev/null
}

build_default_related_domain() {
  local uid="$1"
  local leaves='[]'

  if has_task_field "user_ids"; then
    leaves="$(json_arr_push "$leaves" "$(jq -cn --argjson uid "$uid" '["user_ids","in",[$uid]]')")"
  fi
  if has_task_field "user_id"; then
    leaves="$(json_arr_push "$leaves" "$(jq -cn --argjson uid "$uid" '["user_id","=",$uid]')")"
  fi
  if has_task_field "manager_id"; then
    leaves="$(json_arr_push "$leaves" "$(jq -cn --argjson uid "$uid" '["manager_id","=",$uid]')")"
  fi
  if has_task_field "create_uid"; then
    leaves="$(json_arr_push "$leaves" "$(jq -cn --argjson uid "$uid" '["create_uid","=",$uid]')")"
  fi

  local leaves_count
  leaves_count="$(echo "$leaves" | jq 'length')"
  (( leaves_count > 0 )) || die "Unable to build related-domain (none of user_ids/user_id/manager_id/create_uid exists on project.task)."

  jq -cn --argjson leaves "$leaves" '
    if ($leaves|length) == 1 then
      [$leaves[0]]
    else
      (reduce range(0; ($leaves|length)-1) as $i ([]; . + ["|"])) + $leaves
    end
  '
}

search_read_all() {
  local model="$1"
  local domain_json="$2"
  local fields_json="$3"
  local order="${4:-id asc}"

  local offset=0
  local all='[]'

  while :; do
    local args_json kwargs_json res page count
    args_json="$(jq -cn --argjson domain "$domain_json" --argjson fields "$fields_json" '[$domain,$fields]')"
    kwargs_json="$(jq -cn --argjson ctx "$CONTEXT_JSON" --argjson offset "$offset" --argjson limit "$PAGE_SIZE" --arg order "$order" '{context:$ctx,offset:$offset,limit:$limit,order:$order}')"

    res="$(rpc_call "$model" "search_read" "$args_json" "$kwargs_json")"
    ensure_ok "$res" "$model/search_read"
    page="$(echo "$res" | jq -c '.result // []')"
    count="$(echo "$page" | jq 'length')"
    (( count > 0 )) || break

    all="$(jq -cn --argjson a "$all" --argjson b "$page" '$a + $b')"
    echo "[fetch] model=$model offset=$offset got=$count" >&2
    offset=$((offset + count))

    (( count < PAGE_SIZE )) && break
  done

  echo "$all"
}

# Read a task and return a compact JSON object with the fields we care about
# Output: JSON object
read_task() {
  local id="$1"
  local args_json kwargs_json res

  args_json="$(jq -cn --argjson id "$id" --argjson fields "$TASK_FIELDS_JSON" '[[$id],$fields]')"
  kwargs_json="$(jq -cn --argjson ctx "$CONTEXT_JSON" '{context:$ctx}')"

  res="$(rpc_call "project.task" "read" "$args_json" "$kwargs_json")"
  ensure_ok "$res" "project.task/read"

  echo "$res" | jq -c '.result[0]'
}

# Recursive function:
# - Reads current task
# - For each child_id, calls itself and gathers results in "children"
# - Prints a single JSON object representing the node
build_tree() {
  local id="$1"

  echo "[walk] task=$id" >&2

  local node
  node="$(read_task "$id")"

  # Extract child_ids as a bash-friendly list
  local children_ids
  children_ids="$(echo "$node" | jq -r '.child_ids[]?')"

  # Build children array
  local children_json="[]"
  if [[ -n "${children_ids}" ]]; then
    while IFS= read -r cid; do
      [[ -z "$cid" ]] && continue
      # recurse
      local child_node
      child_node="$(build_tree "$cid")"
      children_json="$(jq -cn --argjson arr "$children_json" --argjson item "$child_node" '$arr + [$item]')"
    done <<< "$children_ids"
  fi

  # Attach children array to node and output
  jq -c --argjson kids "$children_json" '. + {children: $kids}' <<< "$node"
}

build_related_payload() {
  local related_domain="$1"
  local direct_tasks="$2"
  local all_tasks="$3"

  jq -cn \
    --arg mode "$MODE" \
    --arg login "$LOGIN" \
    --argjson uid "$TARGET_UID" \
    --argjson allowed "$ALLOWED_COMPANY_IDS_JSON" \
    --argjson related_domain "$related_domain" \
    --argjson direct "$direct_tasks" \
    --argjson tasks "$all_tasks" '
    {
      mode: $mode,
      login: $login,
      uid: $uid,
      allowed_company_ids: $allowed,
      related_domain: $related_domain,
      generated_at: (now | strftime("%Y-%m-%dT%H:%M:%SZ")),
      totals: {
        direct_related_tasks: ($direct | length),
        tasks_in_related_projects: ($tasks | length),
        projects: ($tasks | map(.project_id[0]? | select(type=="number")) | unique | length)
      },
      projects: (
        $tasks
        | sort_by((.project_id[0]? // -1), .id)
        | group_by(.project_id[0]? // -1)
        | map({
            project_id: (.[0].project_id[0]? // null),
            project_name: (.[0].project_id[1]? // "No Project"),
            task_count: length,
            tasks: .
          })
      ),
      tasks: ($tasks | sort_by((.project_id[0]? // -1), .id))
    }
  '
}

run_related_mode() {
  load_task_field_names

  local related_domain
  if [[ -n "$RELATED_DOMAIN_JSON" ]]; then
    echo "$RELATED_DOMAIN_JSON" | jq -e . >/dev/null || die "RELATED_DOMAIN_JSON is not valid JSON."
    related_domain="$RELATED_DOMAIN_JSON"
  else
    related_domain="$(build_default_related_domain "$TARGET_UID")"
  fi
  echo "[query] related_domain=$related_domain" >&2

  local direct_tasks
  direct_tasks="$(search_read_all "project.task" "$related_domain" "$TASK_FIELDS_JSON" "project_id asc, id asc")"
  direct_tasks="$(echo "$direct_tasks" | jq -c 'unique_by(.id)')"

  local all_tasks="$direct_tasks"
  if [[ "$EXPAND_PROJECT_TASKS" == "1" ]]; then
    local project_ids project_count project_domain expanded
    project_ids="$(echo "$direct_tasks" | jq -c '[.[].project_id[0]? | select(type=="number")] | unique')"
    project_count="$(echo "$project_ids" | jq 'length')"
    if (( project_count > 0 )); then
      project_domain="$(jq -cn --argjson ids "$project_ids" '[["project_id","in",$ids]]')"
      echo "[query] expanding to all tasks from related projects: count=$project_count" >&2
      expanded="$(search_read_all "project.task" "$project_domain" "$TASK_FIELDS_JSON" "project_id asc, id asc")"
      all_tasks="$(jq -cn --argjson direct "$direct_tasks" --argjson expanded "$expanded" '$direct + $expanded | unique_by(.id)')"
    fi
  fi

  build_related_payload "$related_domain" "$direct_tasks" "$all_tasks"
}

# ========= main =========
auth

case "$MODE" in
  tree)
    echo "[main] mode=tree ROOT_TASK_ID=$ROOT_TASK_ID" >&2
    tree="$(build_tree "$ROOT_TASK_ID")"
    ;;
  related)
    echo "[main] mode=related target_uid=$TARGET_UID" >&2
    tree="$(run_related_mode)"
    ;;
  *)
    die "Unknown MODE=$MODE. Expected: related or tree"
    ;;
esac

echo "$tree" | jq '.' > "$OUT_JSON"

echo "[done] wrote: $OUT_JSON" >&2
