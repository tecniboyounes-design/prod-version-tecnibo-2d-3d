import axios from "axios";
import { ODOO_CALL_KW } from "./config";

/** Low-level JSON-RPC call to Odoo (auth comes ONLY from session_id cookie). */
export async function callOdoo(session_id, model, method, args = [], kwargs = {}) {
  const headers = {
    "Content-Type": "application/json",
    Accept: "application/json",
    Cookie: `session_id=${session_id}`,
  };

  const payload = {
    jsonrpc: "2.0",
    method: "call",
    id: Date.now(),
    params: { model, method, args, kwargs },
  };

  const url = `${ODOO_CALL_KW}/${model}/${method}`;
  const { data } = await axios.post(url, payload, { headers });

  if (data?.error) {
    const msg = data.error?.data?.message || data.error?.message || "Odoo error";
    const dbg = data.error?.data?.debug;
    throw new Error(`${msg}${dbg ? `\n${dbg}` : ""}`);
  }

  return data?.result;
}
