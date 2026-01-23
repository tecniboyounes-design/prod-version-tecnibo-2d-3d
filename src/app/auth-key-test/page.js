"use client";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import CancelOutlinedIcon from "@mui/icons-material/CancelOutlined";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import CircularProgress from "@mui/material/CircularProgress";
import Tooltip from "@mui/material/Tooltip";

const ERPTEST_URL = "https://erptest.tecnibo.com/web?db=tecnibo17_test#action=menu&cids=11&menu_id=697";

export default function Page() {
  return (
    <div style={styles.screen}>
      <LoginCard />
    </div>
  );
}

function LoginCard() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);

  // loading flags
  const [probeLoading, setProbeLoading] = useState(false);
  const [connectLoading, setConnectLoading] = useState(false);

  const [result, setResult] = useState(null);
  const [needsKey, setNeedsKey] = useState(false);

  const isTecnibo = useMemo(() => /@tecnibo/i.test(email), [email]);
  const apiKeyLen = apiKey.trim().length;

  // ==== AUTO-PROBE on valid @tecnibo email ====
  const lastProbedRef = useRef("");
  const timerRef = useRef(null);
  const abortRef = useRef(null);

  useEffect(() => {
    if (!isTecnibo) {
      setNeedsKey(false);
      setResult(null);
      lastProbedRef.current = "";
      if (abortRef.current) abortRef.current.abort();
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }
    const candidate = email.trim().toLowerCase();
    if (candidate && candidate === lastProbedRef.current) return;

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      if (abortRef.current) abortRef.current.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;

      setProbeLoading(true);
      setNeedsKey(false);
      setResult(null);
      console.group("[client] auto-probe");
      console.log("email:", candidate);

      try {
        console.time("[client] probe fetch");
        const res = await fetch("/api/rp_auth", {
          method: "GET",
          headers: { "x-odoo-login": candidate },
          cache: "no-store",
          signal: ctrl.signal,
        });
        console.timeEnd("[client] probe fetch");
        const payload = await res.json().catch(() => ({}));
        console.log("status:", res.status, "payload:", payload);

        lastProbedRef.current = candidate;

        if (payload?.action === "redirect" && payload?.redirect_to) {
          console.log("redirecting to:", payload.redirect_to);
          console.groupEnd();
          return router.push(payload.redirect_to);
        }
        if (payload?.require_api_key) {
          console.log("server requires API key – revealing field");
          setNeedsKey(true);
        }
        setResult({ ok: !!payload?.ok, status: res.status, payload });
      } catch (err) {
        if (err?.name === "AbortError") {
          console.log("probe aborted");
        } else {
          console.error("[client] probe error:", err);
          setResult({ ok: false, status: 0, payload: { error: "NETWORK_ERROR", detail: String(err) } });
        }
      } finally {
        setProbeLoading(false);
        console.groupEnd();
      }
    }, 350);
  }, [email, isTecnibo, router]);
  

  // ==== CONNECT with API key ====
  const connect = useCallback(async () => {
    if (!isTecnibo || !apiKeyLen || connectLoading) return;

    setConnectLoading(true);
    setResult(null);
    console.group("[client] connect");
    console.log("email:", email, "apiKey(masked):", apiKey ? `${apiKey.slice(0,4)}…${apiKey.slice(-4)}` : null);

    try {
      console.time("[client] connect fetch");
      const res = await fetch("/api/rp_auth", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${apiKey.trim()}`,
          "x-odoo-login": email.trim(),
        },
        cache: "no-store",
      });
      console.timeEnd("[client] connect fetch");
      const payload = await res.json().catch(() => ({}));
      console.log("status:", res.status, "payload:", payload);

      if (payload?.ok && payload?.user) {
        console.log("auth ok -> redirect /");
        console.groupEnd();
        return router.push("/");
      }
      console.log("auth not ok – show result");
      setResult({ ok: !!payload?.ok, status: res.status, payload });
    } catch (err) {
      console.error("[client] connect error:", err);
      setResult({ ok: false, status: 0, payload: { error: "NETWORK_ERROR", detail: String(err) } });
    } finally {
      setConnectLoading(false);
      console.groupEnd();
    }
  }, [email, apiKey, apiKeyLen, isTecnibo, connectLoading, router]);

  // tooltip text
  const helpText =
    "Open your Odoo profile: click your avatar → Preferences → Account Security → New API Key. Copy it and paste here.";
    

  return (
    <div style={styles.card}>
      <div style={styles.headerRow}>
        <h1 style={styles.title}>Connect to Odoo</h1>
        {email ? (
          isTecnibo ? (
            <Badge color="#065f46" bg="#ecfdf5" icon={<CheckCircleOutlineIcon fontSize="small" />} label="internal" />
          ) : (
            <Badge color="#92400e" bg="#fffbeb" icon={<CancelOutlinedIcon fontSize="small" />} label="not @tecnibo" />
          )
        ) : null}
      </div>

      <p style={styles.subtle}>
        Enter your Tecnibo email. We’ll check the server instantly and redirect if a valid key exists.
      </p>

      {/* EMAIL with inline spinner + erptest hint */}
      <div style={{ marginTop: 16, marginBottom: 12 }}>
        <label style={styles.label}>Tecnibo email</label>
        <div style={{ position: "relative" }}>
          <input
            type="email"
            placeholder="name@tecnibo.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ ...styles.input, paddingRight: 36 }}
            required
            autoFocus
          />
          {probeLoading && (
            <div style={styles.inputSpinner}>
              <CircularProgress size={18} />
            </div>
          )}
        </div>
        <div style={styles.hint}>
          Must contain <strong>@tecnibo</strong>.{" "}
          <a href={ERPTEST_URL} target="_blank" rel="noreferrer" style={styles.link}>
            Open Odoo (erptest)
          </a>
          <Tooltip title={helpText} arrow>
            <span style={styles.helpIcon}><HelpOutlineIcon fontSize="small" /></span>
          </Tooltip>
        </div>
      </div>

      {/* API Key section (only if required by server) */}
      {needsKey && (
        <form onSubmit={(e) => { e.preventDefault(); connect(); }} style={{ marginTop: 16 }}>
          <div style={{ marginBottom: 12 }}>
            <label style={styles.label}>
              Odoo API key{" "}
              <Tooltip title={helpText} arrow>
                <span style={styles.helpIcon}><HelpOutlineIcon fontSize="small" /></span>
              </Tooltip>
            </label>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                type={showKey ? "text" : "password"}
                placeholder="40-char key"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                style={{ ...styles.input, flex: 1 }}
                required
                minLength={10}
              />
              <button
                type="button"
                onClick={() => setShowKey((v) => !v)}
                style={styles.iconBtn}
                aria-label={showKey ? "Hide API key" : "Show API key"}
              >
                {showKey ? <VisibilityOffIcon /> : <VisibilityIcon />}
              </button>
            </div>
            <div style={styles.metaRow}>
              <span>Length: <strong>{apiKey.trim().length}</strong></span>
              <span>
                Need a key?{" "}
                <a href={ERPTEST_URL} target="_blank" rel="noreferrer" style={styles.link}>
                  Open Odoo
                </a>
              </span>
            </div>
          </div>

          <button
            type="submit"
            disabled={!isTecnibo || !apiKeyLen || connectLoading}
            style={{ ...styles.primaryBtn, opacity: isTecnibo && apiKeyLen && !connectLoading ? 1 : 0.6, cursor: isTecnibo && apiKeyLen && !connectLoading ? "pointer" : "not-allowed" }}
          >
            {connectLoading ? <CircularProgress size={18} /> : "Connect"}
          </button>
        </form>
      )}

      <ResultPanel result={result} />

      <p style={styles.footnote}>
        Debug: check DevTools console for <code>[client]</code> logs; server logs show <code>[rp_auth]</code>.
      </p>
    </div>
  );
}

function Badge({ color, bg, icon, label }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 8px", borderRadius: 999, color, background: bg, fontSize: 12 }}>
      {icon}
      {label}
    </span>
  );
}

function ResultPanel({ result }) {
  if (!result) return null;
  const { ok, status, payload } = result;

  if (payload?.require_api_key) {
    return (
      <div style={{ ...styles.alert, borderColor: "#bfdbfe", background: "#eff6ff", color: "#1e3a8a" }}>
        {payload?.message || "Please paste your Odoo API key."}
      </div>
    );
  }

  if (!ok && payload) {
    const code = payload?.error || "UNKNOWN";
    const msgMap = {
      AUTH_FALSE: "API key is invalid for this user/database.",
      MISSING_API_KEY: "No API key sent.",
      MISSING_LOGIN: "Email/login missing.",
      READ_FAILED: "Authenticated but could not read user info.",
      JSONRPC_FAILED: "Odoo JSON-RPC failed.",
      NETWORK_ERROR: "Network error. Check connectivity.",
      SERVER_ERROR: "Server error. Try again.",
    };
    return (
      <div style={{ ...styles.alert, borderColor: "#fecaca", background: "#fef2f2", color: "#7f1d1d" }}>
        Failed ({status}) · {code} — {msgMap[code] || String(payload?.detail || "")}
      </div>
    );
  }

  return null;
}



/* ===== inline styles ===== */
const styles = {
  screen: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(to bottom, #fff, #f8fafc)", padding: 24 },
  card: { width: "100%", maxWidth: 520, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 16, padding: 20, boxShadow: "0 1px 2px rgba(0,0,0,0.04)" },
  headerRow: { display: "flex", alignItems: "center", justifyContent: "space-between" },
  title: { fontSize: 20, fontWeight: 600 },
  subtle: { color: "#64748b", marginTop: 6, fontSize: 13 },
  label: { display: "block", fontSize: 14, fontWeight: 500, color: "#334155", marginBottom: 6 },
  input: { width: "80%", border: "1px solid #cbd5e1", borderRadius: 12, padding: "10px 12px", outline: "none" },
  inputSpinner: { position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" },
  hint: { marginTop: 6, fontSize: 12, color: "#64748b" },
  link: { textDecoration: "underline", color: "#0ea5e9" },
  helpIcon: { display: "inline-flex", verticalAlign: "middle", marginLeft: 6, cursor: "help", color: "#334155" },
  iconBtn: { display: "inline-flex", alignItems: "center", justifyContent: "center", border: "1px solid #cbd5e1", borderRadius: 12, padding: "0 10px", background: "#fff" },
  metaRow: { marginTop: 6, fontSize: 12, color: "#64748b", display: "flex", justifyContent: "space-between" },
  primaryBtn: { width: "100%", border: 0, borderRadius: 12, padding: "10px 12px", background: "#059669", color: "#fff", fontWeight: 600 },
  alert: { marginTop: 16, border: "1px solid", borderRadius: 12, padding: 12 },
  footnote: { marginTop: 12, textAlign: "center", fontSize: 12, color: "#64748b" },
};
