export async function getOdooSessionInfo() {
  const res = await fetch('/api/odoo/web/session/get_session_info', {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
      'Accept': 'application/json',
    },
    body: JSON.stringify({}),
    cache: 'no-store',
  });
  if (!res.ok) return null;

  const data = await res.json(); // { jsonrpc, result?, error? }
  if (data?.error) return null;

  return data?.result ?? null; // { uid, name, user_companies, ... }
}
