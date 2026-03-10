/** Safe JSON stringify for logs. */
export const safe = (obj) => {
  try {
    return JSON.stringify(obj, null, 2);
  } catch {
    return String(obj);
  }
};

export function log(...a) {
  console.log("[/api/createSubSO]", ...a);
}
