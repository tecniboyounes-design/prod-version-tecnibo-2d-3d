// /src/app/api/authenticate/odooCode/route.js
import { getCorsHeaders, handleCorsPreflight } from "@/lib/cors";
import fs from "fs";

// ====== CONFIG ======
const ODOO_BASE_URL   = process.env.ODOO_URL || process.env.ODOO_BASE_URL || process.env.ODOO_BASE;
const ODOO_DB_NAME    = process.env.ODOO_DB  || process.env.ODOO_DB_NAME;
if (!ODOO_BASE_URL) throw new Error("[odooCode] ODOO_URL env is required");
if (!ODOO_DB_NAME) throw new Error("[odooCode] ODOO_DB env is required");
const APPROVAL_MODE   = (process.env.APPROVAL_MODE  || "self").toLowerCase(); // "self" | "admin"
const APPROVER_EMAILS = (process.env.APPROVER_EMAILS || "").split(",").map(s => s.trim().toLowerCase()).filter(Boolean);

// In-memory challenge store (use Redis in prod)
const challenges = new Map();

// ---- helpers ----
function nowIso() { return new Date().toISOString(); }
function log(...args) { console.log(`[odooCode][${nowIso()}]`, ...args); }

function genCode(len = 8) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

// Clean old challenges every 10 minutes (5 min TTL for each)
setInterval(() => {
  const now = Date.now();
  let expired = 0;
  for (const [k, v] of challenges) {
    if (now - v.createdAt > 5 * 60_000) {
      v.status = "expired";
      challenges.delete(k);
      expired++;
    }
  }
  if (expired) log(`cleanup: expired ${expired} challenge(s)`);
}, 10 * 60_000);

// --- logging to file (unchanged shape) ---
function appendToLogFile(logEntry) {
  const logFilePath = "auth-logs.json";
  let logs = [];
  try {
    const fileContent = fs.readFileSync(logFilePath, "utf8");
    if (fileContent) logs = JSON.parse(fileContent);
  } catch {}
  logs.push(logEntry);
  try {
    fs.writeFileSync(logFilePath, JSON.stringify(logs, null, 2), "utf8");
  } catch (error) {
    console.error("[odooCode] failed to write to log file:", error);
  }
}

// ---- Odoo RPC helpers ----
async function odooAuthenticate(email, password) {
  const payload = {
    jsonrpc: "2.0",
    method: "call",
    params: { db: ODOO_DB_NAME, login: email, password },
    id: 1,
  };
  const url = `${ODOO_BASE_URL}/web/session/authenticate`;
  log("odooAuthenticate: POST", url, "email=", email);
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => ({}));
  const setCookie = response.headers.get("set-cookie");
  let sessionId = null;
  if (setCookie) {
    const match = setCookie.match(/session_id=([^;]+)/);
    sessionId = match ? match[1] : null;
  }
  return { data, sessionId, setCookie };
}

async function getOdooProfile(sessionId) {
  const url = `${ODOO_BASE_URL}/web/session/get_session_info`;
  log("getOdooProfile: POST", url, "session_id=", sessionId ? sessionId.slice(0,8)+"…" : null);
  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
      Cookie: `session_id=${sessionId}`,
    },
    body: JSON.stringify({ jsonrpc: "2.0", method: "call", params: {}, id: 1 }),
  });
  const data = await resp.json().catch(() => ({}));
  return data?.result || data;
}

function normalizeEmail(v) {
  return (v || "").trim().toLowerCase();
}

// ---- HTTP Handlers ----

export async function OPTIONS(request) {
  log("OPTIONS: CORS preflight");
  return handleCorsPreflight(request);
}

/**
 * POST: start flow (email-only) or password login
 * Body: { email, password? }
 */
export async function POST(request) {
  const corsHeaders = getCorsHeaders(request);
  let email = "unknown";
  try {
    const body = await request.json().catch(() => ({}));
    email = normalizeEmail(body?.email);
    const hasPwd = !!body?.password;

    log("POST: start", { email, hasPwd, APPROVAL_MODE });

    if (!email) {
      appendToLogFile({ timestamp: nowIso(), email: "unknown", result: "failure", message: "Missing email" });
      log("POST: missing email");
      return new Response(JSON.stringify({ message: "Missing email", result: false }), { status: 400, headers: corsHeaders });
    }

    // Email-only path (no password) -> create challenge
    if (!hasPwd) {
      const code = genCode();
      challenges.set(code, { email, status: "pending", createdAt: Date.now() });
      appendToLogFile({ timestamp: nowIso(), email, result: "pending", message: "Challenge created; awaiting approval", code });
      log("POST: challenge created", { code, email, status: "pending" });
      return new Response(JSON.stringify({ result: "pending", code, approvalMode: APPROVAL_MODE }), { status: 200, headers: corsHeaders });
    }

    // Password path -> do normal auth now
    const { data, sessionId, setCookie } = await odooAuthenticate(email, body.password);
    const ok = !!data?.result;
    appendToLogFile({
      timestamp: nowIso(),
      email,
      result: ok ? "success" : "failure",
      message: ok ? "Authentication succeeded" : "Authentication failed",
      response: data,
    });

    let cookieHeader = null;
    if (sessionId) {
      const isSecure = process.env.NODE_ENV === "production" ? "; Secure" : "";
      cookieHeader = `session_id=${sessionId}; Path=/; HttpOnly; SameSite=Lax${isSecure}`;
    }

    log("POST: password path finished", { ok, hasSession: !!sessionId });
    if (ok) {
      return new Response(JSON.stringify({ message: "Request succeeded", result: true, session_id: sessionId, response: data }), {
        status: 200,
        headers: { ...corsHeaders, ...(cookieHeader && { "Set-Cookie": cookieHeader }) },
      });
    } else {
      return new Response(JSON.stringify({ message: "Request failed", result: false, response: data }), {
        status: 400,
        headers: corsHeaders,
      });
    }
  } catch (error) {
    appendToLogFile({ timestamp: nowIso(), email, result: "error", message: "Internal server error", error: error.message });
    console.error("[odooCode] POST error:", error);
    return new Response(JSON.stringify({ message: "Internal server error", result: false, error: error.message }), {
      status: 500,
      headers: corsHeaders,
    });
  }
}

/**
 * GET: poll by code
 * Query: ?code=XXXX
 */
export async function GET(request) {
  const corsHeaders = getCorsHeaders(request);
  const { searchParams } = new URL(request.url);
  const code = (searchParams.get("code") || "").trim();

  log("GET: poll", { code });

  if (!code) {
    log("GET: poll missing code");
    return new Response(JSON.stringify({ message: "Missing code" }), { status: 400, headers: corsHeaders });
  }

  const ch = challenges.get(code);
  if (!ch) {
    log("GET: poll -> invalid code");
    return new Response(JSON.stringify({ status: "invalid" }), { status: 200, headers: corsHeaders });
  }

  if (ch.status === "approved" && ch.session_id) {
    log("GET: poll -> approved (returning profile + session)");
    return new Response(JSON.stringify({
      status: "approved",
      session_id: ch.session_id,
      profile: ch.profile || null,
      approvalMode: APPROVAL_MODE,
    }), { status: 200, headers: corsHeaders });
  }

  if (ch.status === "expired") {
    log("GET: poll -> expired");
    return new Response(JSON.stringify({ status: "expired" }), { status: 200, headers: corsHeaders });
  }

  // pending
  return new Response(JSON.stringify({ status: "pending" }), { status: 200, headers: corsHeaders });
}

/**
 * PUT: Odoo calls this after approval
 * Body: { code, email, session_id, signature? }
 *
 * - APPROVAL_MODE = "self": approver must be the same user as the request email
 * - APPROVAL_MODE = "admin": approver must be admin, or email included in APPROVER_EMAILS
 */
export async function PUT(request) {
  const corsHeaders = getCorsHeaders(request);
  const body = await request.json().catch(() => ({}));
  const code       = (body?.code || "").trim();
  const requestEmail = normalizeEmail(body?.email);
  const session_id = (body?.session_id || "").trim();
  const signature  = body?.signature || null;

  log("PUT: approval attempt", { code, requestEmail, hasSession: !!session_id, signature: !!signature, mode: APPROVAL_MODE });

  if (!code || !requestEmail || !session_id) {
    log("PUT: missing required fields");
    return new Response(JSON.stringify({ message: "Missing code/email/session_id" }), { status: 400, headers: corsHeaders });
  }

  const ch = challenges.get(code);
  if (!ch || normalizeEmail(ch.email) !== requestEmail) {
    log("PUT: invalid challenge or email mismatch", { challengeEmail: ch?.email, requestEmail });
    return new Response(JSON.stringify({ message: "Invalid code or email mismatch" }), { status: 400, headers: corsHeaders });
  }

  // (Optional) verify signature/HMAC or IP allowlist here
  // TODO: implement HMAC verification if you add SHARED_SECRET

  // Fetch approver profile from Odoo session_id
  const approverProfile = await getOdooProfile(session_id).catch((e) => {
    console.error("[odooCode] PUT getOdooProfile error:", e);
    return null;
  });

  const approverEmail = normalizeEmail(approverProfile?.username || approverProfile?.user_context?.login || "");
  const approverIsAdmin = !!approverProfile?.is_admin;

  log("PUT: approver profile", {
    approverEmail,
    approverIsAdmin,
    sameAsRequester: approverEmail === requestEmail,
  });

  // Enforce approval mode
  if (APPROVAL_MODE === "self") {
    if (approverEmail !== requestEmail) {
      log("PUT: self-approval required but approver != requester");
      return new Response(JSON.stringify({ message: "Self-approval required: approver must be the same user" }), { status: 403, headers: corsHeaders });
    }
  } else if (APPROVAL_MODE === "admin") {
    const allowListed = APPROVER_EMAILS.includes(approverEmail);
    if (!approverIsAdmin && !allowListed) {
      log("PUT: admin approval required but approver not admin/allow-listed");
      return new Response(JSON.stringify({ message: "Admin approval required" }), { status: 403, headers: corsHeaders });
    }
  }

  // Success: store approved state + profile of the *requester* for client use
  // If you prefer the requester's profile (not the approver), fetch it via an RPC using the requester login.
  // Here we reuse the approver session; in "self" mode that's the same user; in "admin" mode you may want a server-side lookup of requester.
  const profileForClient = approverProfile || null;

  ch.status     = "approved";
  ch.session_id = session_id;
  ch.profile    = profileForClient;
  ch.approvedAt = Date.now();
  challenges.set(code, ch);

  appendToLogFile({
    timestamp: nowIso(),
    email: requestEmail,
    result: "success",
    message: `Challenge approved via Odoo (${APPROVAL_MODE})`,
    code,
    approver: { email: approverEmail, is_admin: approverIsAdmin },
  });

  log("PUT: approved", { code, requestEmail, approverEmail });

  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: corsHeaders });
}
