// src/app/api/auth/key/rotate/route.js
import fs from "fs";
import path from "path";

const ODOO_URL = process.env.ODOO_URL;
const DATABASE_NAME = process.env.ODOO_DB;
if (!ODOO_URL) throw new Error("[auth/key/rotate] ODOO_URL env is required");
if (!DATABASE_NAME) throw new Error("[auth/key/rotate] ODOO_DB env is required");
const KEY_STORE_FILE = path.resolve(process.cwd(), "odoo-api-keys.json");

function readJson(file, fallback) {
  try { const raw = fs.readFileSync(file, "utf8"); return raw ? JSON.parse(raw) : fallback; }
  catch { return fallback; }
}
function writeJson(file, obj) {
  try { fs.writeFileSync(file, JSON.stringify(obj, null, 2), "utf8"); }
  catch (e) { console.error("[auth/key/rotate] writeJson failed:", file, e?.message); }
}

function findUserByEmail(store, email) {
  return store.users?.find(u => u.email.toLowerCase() === String(email).toLowerCase());
}

async function odooAuthenticate({ login, passwordOrApiKey }) {
  const payload = { jsonrpc: "2.0", method: "call", params: { db: DATABASE_NAME, login, password: passwordOrApiKey }, id: Date.now() };
  const res = await fetch(`${ODOO_URL}/web/session/authenticate`, {
    method: "POST", headers: { "Content-Type": "application/json", "Accept": "application/json" },
    credentials: "include", body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => null);
  const setCookie = res.headers.get("set-cookie") || "";
  const m = setCookie.match(/session_id=([^;]+)/);
  const sessionId = m ? m[1] : null;
  return { ok: Boolean(data?.result && sessionId), sessionId };
}

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const email = (body?.email || "").trim();
    const newApiKey = (body?.apiKey || "").trim();
    if (!email || !newApiKey) {
      return new Response(JSON.stringify({ result: false, message: "email and apiKey required" }), { status: 400 });
    }
    // verify new key with Odoo first
    const auth = await odooAuthenticate({ login: email, passwordOrApiKey: newApiKey });
    if (!auth.ok) return new Response(JSON.stringify({ result: false, message: "Invalid API key" }), { status: 401 });

    const store = readJson(KEY_STORE_FILE, { users: [] });
    const rec = findUserByEmail(store, email);
    if (!rec) store.users.push({ id: crypto.randomUUID?.() || Date.now().toString(), email, apiKey: newApiKey, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    else { rec.apiKey = newApiKey; rec.updatedAt = new Date().toISOString(); }
    writeJson(KEY_STORE_FILE, store);

    return new Response(JSON.stringify({ result: true, message: "Key rotated" }), { status: 200 });
  } catch (e) {
    return new Response(JSON.stringify({ result: false, message: "Server error", error: String(e) }), { status: 500 });
  }
}
