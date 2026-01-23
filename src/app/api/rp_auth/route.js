import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

/* ================== STATIC CONFIG ================== */
const ODOO_URL  = process.env.ODOO_URL;
const DB        = process.env.ODOO_DB;
if (!ODOO_URL) throw new Error("[rp_auth] ODOO_URL env is required");
if (!DB) throw new Error("[rp_auth] ODOO_DB env is required");
const DEFAULT_LOGIN = "y.attaoui@tecnibo.com";
const USER_FIELDS = ["id","name","login","email","tz","lang","company_id","partner_id","groups_id"];
/* =================================================== */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/* ================== FS helpers ================== */
const DATA_ROOT = process.env.RP_USERS_DIR || path.join(process.cwd(), "var", "odoo_rp", "users");

const sanitize = (s) => String(s || "").toLowerCase().trim().replace(/[^a-z0-9_.@-]+/g, "_");
const mask = (s, keep = 4) => (typeof s === "string" && s.length > keep * 2 ? `${s.slice(0, keep)}…${s.slice(-keep)}` : s);

async function ensureDir(dir) { await fs.mkdir(dir, { recursive: true }); }

async function writeUserInitFile({ uid, login, email, api_key, odoo }) {
  await ensureDir(DATA_ROOT);
  const emailSafe = sanitize(email || login || "unknown");
  const uidSafe = String(uid || "nouid");
  const file = path.join(DATA_ROOT, `${uidSafe}_${emailSafe}.json`);
  const record = {
    created_at: new Date().toISOString(),
    uid, login, email,
    api_key,                // plaintext by request (consider encrypting in prod)
    api_key_masked: mask(api_key),
    odoo,                   // { url, db }
  };
  await fs.writeFile(file, JSON.stringify(record, null, 2), { encoding: "utf8", mode: 0o600 });
  return file;
}

/** Return newest JSON file for email (if any) */
async function readLatestUserInitByEmail(email) {
  try {
    const emailSafe = sanitize(email);
    await ensureDir(DATA_ROOT);
    const names = await fs.readdir(DATA_ROOT);
    const matches = names.filter((n) => n.endsWith(`_${emailSafe}.json`));
    if (!matches.length) return null;
    const stats = await Promise.all(matches.map(async (n) => {
      const p = path.join(DATA_ROOT, n);
      const st = await fs.stat(p);
      return { p, n, mtime: st.mtimeMs };
    }));
    const newest = stats.sort((a, b) => b.mtime - a.mtime)[0];
    const raw = await fs.readFile(newest.p, "utf8");
    return { file: newest.p, data: JSON.parse(raw) };
  } catch (e) {
    console.warn("[rp_auth] readLatestUserInitByEmail error:", e);
    return null;
  }
}

/* ============== header + misc helpers ============== */
function extractApiKey(req) {
  const auth = (req.headers.get("authorization") || "").trim();
  const m = auth.match(/^Bearer\s+(.+)$/i);
  const fromAuth = (m?.[1] || auth).trim();
  const fromHeader = (req.headers.get("x-odoo-api-key") || "").trim();
  return (fromAuth || fromHeader) || null;
}

function extractLogin(req) {
  const hdr = (req.headers.get("x-odoo-login") || "").trim();
  return hdr || DEFAULT_LOGIN;
}

const isInternalEmail = (e) => /@tecnibo/i.test(e || "");


/* ============== JSON-RPC ============== */
async function jsonrpc(pathname, payload, tag = "rpc") {
  const body = { jsonrpc: "2.0", id: Date.now(), ...payload };
  console.log(`[rp_auth] -> ${tag}`, { url: `${ODOO_URL}${pathname}`, svc: payload?.params?.service, method: payload?.params?.method });
  const res = await fetch(`${ODOO_URL}${pathname}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  const headersObj = Object.fromEntries(Array.from(res.headers.entries()));
  console.log(`[rp_auth] ${tag} headers:`, headersObj);

  const text = await res.text();
  let json; try { json = JSON.parse(text); } catch { json = null; }
  console.log(`[rp_auth] <- ${tag}`, { status: res.status, hasJson: !!json, keys: json ? Object.keys(json) : [] });

  return { status: res.status, text, json };
}

/* ============== flows ============== */
async function handleEmailProbe(login) {
  console.group("[rp_auth] handleEmailProbe");
  console.log("login:", login, "internal:", isInternalEmail(login));

  if (!isInternalEmail(login)) {
    console.log("result: EMAIL_NOT_INTERNAL -> require_api_key");
    console.groupEnd();
    return NextResponse.json({
      ok: true, mode: "email_probe", is_internal: false, require_api_key: true,
      reason: "EMAIL_NOT_INTERNAL", message: "Use your @tecnibo email.",
    }, { status: 200 });
  }

  const hit = await readLatestUserInitByEmail(login);
  console.log("localHit:", !!hit, hit?.file || "no-file");
  if (!hit?.data?.api_key) {
    console.log("result: NO_STORED_KEY -> require_api_key");
    console.groupEnd();
    return NextResponse.json({
      ok: true, mode: "email_probe", is_internal: true, require_api_key: true,
      reason: "NO_STORED_KEY", message: "No API key stored for this email. Please paste your Odoo API key.",
    }, { status: 200 });
  }

  const masked = mask(hit.data.api_key);
  console.log("storedKey(masked):", masked);
  const auth = await jsonrpc("/jsonrpc", {
    method: "call",
    params: { service: "common", method: "authenticate", args: [DB, login, hit.data.api_key, {}] },
  }, "probe_auth");

  const uid = auth?.json?.result;
  console.log("probe_auth uid:", uid);
  if (!Number.isInteger(uid)) {
    console.log("result: KEY_INVALID -> require_api_key");
    console.groupEnd();
    return NextResponse.json({
      ok: true, mode: "email_probe", is_internal: true, require_api_key: true,
      reason: "KEY_INVALID", message: "Stored API key is invalid or revoked. Please paste a new Odoo API key.",
    }, { status: 200 });
  }

  console.log("result: auto_login -> redirect /");
  console.groupEnd();

  // Optional: mini-read for UI
  let user = null;
  try {
    const read = await jsonrpc("/jsonrpc", {
      method: "call",
      params: {
        service: "object",
        method: "execute_kw",
        args: [DB, uid, hit.data.api_key, "res.users", "read", [[uid], USER_FIELDS]],
      },
    }, "probe_read");
    user = Array.isArray(read?.json?.result) ? read.json.result[0] : null;
  } catch {}

  return NextResponse.json({
    ok: true, mode: "auto_login", action: "redirect", redirect_to: "/", uid,
    user: user ? { id: user.id, name: user.name, login: user.login, email: user.email, tz: user.tz, lang: user.lang, company_id: user.company_id, partner_id: user.partner_id } : null,
    message: "Authenticated with stored API key.",
  }, { status: 200 });
}


async function handleConnect(login, apiKey) {
  console.group("[rp_auth] handleConnect");
  console.log("login:", login, "apiKey(masked):", mask(apiKey));

  const auth = await jsonrpc("/jsonrpc", {
    method: "call",
    params: { service: "common", method: "authenticate", args: [DB, login, apiKey, {}] },
  }, "auth");

  const uid = auth?.json?.result;
  console.log("auth uid:", uid);
  if (!Number.isInteger(uid)) {
    console.log("result: AUTH_FALSE");
    console.groupEnd();
    return NextResponse.json({
      ok: false, error: "AUTH_FALSE", hint: "API key must be created on this server & DB for this login.", db: DB, login,
    }, { status: 401 });
  }

  const read = await jsonrpc("/jsonrpc", {
    method: "call",
    params: {
      service: "object",
      method: "execute_kw",
      args: [DB, uid, apiKey, "res.users", "read", [[uid], USER_FIELDS]],
    },
  }, "readUser");

  const user = Array.isArray(read?.json?.result) ? read.json.result[0] : null;
  console.log("read ok:", !!user);
  if (!user) {
    console.log("result: READ_FAILED");
    console.groupEnd();
    return NextResponse.json({ ok: false, error: "READ_FAILED", detail: read?.json?.error || read?.text || null }, { status: 502 });
  }

  let stored = false, storage_path;
  try {
    storage_path = await writeUserInitFile({
      uid, login: user.login, email: user.email || user.login, api_key: apiKey, odoo: { url: ODOO_URL, db: DB },
    });
    stored = true;
    console.log("writeUserInitFile:", stored, storage_path);
  } catch (e) {
    console.warn("[rp_auth] writeUserInitFile failed:", e);
  }
  console.log("result: ok -> return user");
  console.groupEnd();

  const extra = process.env.NODE_ENV === "production" ? {} : { storage_path };
  return NextResponse.json({ ok: true, mode: "auth", uid, user, stored, ...extra }, { status: 200 });
}

/* ============== request router ============== */
async function run(req) {
  const login  = extractLogin(req);
  const apiKey = extractApiKey(req);
  console.group("[rp_auth] run");
  console.log("method:", req.method, "login:", login, "hasApiKey:", !!apiKey);

  if (!apiKey && login) { console.log("branch: email_probe"); console.groupEnd(); return handleEmailProbe(login); }
  if (apiKey)             { console.log("branch: connect");     console.groupEnd(); return handleConnect(login, apiKey); }

  console.log("branch: missing_login");
  console.groupEnd();
  return NextResponse.json({ ok: false, error: "MISSING_LOGIN", hint: "Send x-odoo-login header with your Tecnibo email." }, { status: 400 });
}


export async function GET(req)  { return run(req); }
export async function POST(req) { return run(req); }
