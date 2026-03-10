export const ODOO_HOST = (process.env.ODOO_BASE || "https://erptest.tecnibo.com").replace(/\/$/, "");

export const ODOO_CALL_KW = ODOO_HOST.includes("/web/dataset/call_kw")
  ? ODOO_HOST
  : `${ODOO_HOST}/web/dataset/call_kw`;
