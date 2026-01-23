// src/app/_lib/session.ts (client)
"use client";

/** Resolve current user via the HttpOnly cookie (through our server). */
export async function getSessionUser() {
  try {
    const res = await fetch("/api/me", {
      method: "GET",
      credentials: "include",         
      headers: { Accept: "application/json" },
      cache: "no-store",
    });

    const isJson = res.headers.get("content-type")?.includes("application/json");
    const payload = isJson ? await res.json() : null;

    if (!res.ok) {
      return { ok: false, error: payload?.error || `HTTP ${res.status}` };
    }
    return { ok: true, data: payload };
  } catch (e) {
    return { ok: false, error: e?.message || "Network error" };
  }
}

export async function checkSessionAndGetUser() {
  const { ok, data } = await getSessionUser();
  if (!ok || !data) return null;

  const { uid, session_info, employee } = data;
  return {
    uid,
    name: session_info?.name,
    username: session_info?.username,
    currentCompany: session_info?.user_companies?.current_company,
    allowedCompanies: session_info?.user_companies?.allowed_companies,
    job_position: employee || null,
    session_info,
  };
}
