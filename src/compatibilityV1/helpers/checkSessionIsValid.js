// /compatibilityV1/helpers/checkSessionIsValid.js
export async function checkSessionIsValid(sessionId) {
  if (!sessionId) return { ok: false };

  try {
    const res = await fetch("/api/getEmployeeBySession", {
      method: "GET",
      headers: {
        "x-session-id": sessionId,
        Accept: "application/json",
      },
      credentials: "include",
      cache: "no-store",
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok || data?.error) return { ok: false };
    return { ok: true, data };
  } catch {
    return { ok: false };
  }
}
