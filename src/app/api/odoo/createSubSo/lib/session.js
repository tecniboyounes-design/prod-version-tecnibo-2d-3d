import axios from "axios";
import { ODOO_HOST } from "./config";
import { ensureInt } from "./primitives";

/** Get actual session user uid from Odoo session (best-effort). */
export async function getSessionUid(session_id) {
  try {
    const headers = {
      "Content-Type": "application/json",
      Accept: "application/json",
      Cookie: `session_id=${session_id}`,
    };

    const url = `${ODOO_HOST}/web/session/get_session_info`;
    const { data } = await axios.post(url, {}, { headers });

    const uid = data?.result?.uid ?? data?.uid;
    return ensureInt(uid) || false;
  } catch {
    return false;
  }
}
