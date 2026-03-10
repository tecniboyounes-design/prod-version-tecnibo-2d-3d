/**
 * Typed Odoo error and classifier.
 *
 * Preserves the raw Odoo JSON-RPC error envelope so callers can distinguish
 * AccessError / SessionExpired / MissingError / UserError from generic 500s.
 *
 * Odoo error envelope shape (data.error):
 * {
 *   code: 200,
 *   message: "Odoo Server Error",
 *   data: {
 *     name: "odoo.exceptions.AccessError",   ← primary discriminator
 *     exception_type: "access_error",        ← present in Odoo 16+
 *     message: "You are not allowed...",
 *     debug: "Traceback ...",
 *     arguments: [...]
 *   }
 * }
 */
export class OdooError extends Error {
    constructor(envelope) {
        const data = envelope?.data || {};
        const message = data.message || envelope?.message || "Odoo error";
        super(message);
        this.name = "OdooError";
        this.odooName = data.name || null;           // e.g. "odoo.exceptions.AccessError"
        this.odooType = data.exception_type || null; // e.g. "access_error"
        this.odooMessage = data.message || null;
        this.odooDebug = data.debug || null;
        this.raw = envelope;
    }
}

/** Known Odoo exception name fragments → kind (checked in priority order). */
const NAME_RULES = [
    ["SessionExpiredException", "session_expired"],
    ["AccessError", "access_error"],
    ["Forbidden", "access_error"],
    ["MissingError", "missing_error"],
    ["UserError", "user_error"],
    ["ValidationError", "user_error"],
    ["RedirectWarning", "user_error"],
];

/** exception_type field values (Odoo 16+) → kind. */
const TYPE_MAP = {
    session_expired: "session_expired",
    access_error: "access_error",
    missing: "missing_error",
    user_error: "user_error",
    validation_error: "user_error",
};

/** Fallback message-pattern matching for older Odoo instances. */
const MSG_RULES = [
    [/session.*expired|not.*logged.*in/i, "session_expired"],
    [/not allowed to (read|write|create|unlink|access)/i, "access_error"],
    [/ir\.model\.access|ir\.rule|access right/i, "access_error"],
    [/record.*not found|does not exist/i, "missing_error"],
];

const KIND_META = {
    session_expired: {
        httpStatus: 401,
        error: "odoo_session_expired",
        details: "Your Odoo session has expired. Please log in again and retry.",
    },
    access_error: {
        httpStatus: 403,
        error: "odoo_access_denied",
        details:
            "You do not have permission to perform this operation in Odoo. Contact your administrator to review access rights.",
    },
    missing_error: {
        httpStatus: 404,
        error: "odoo_record_missing",
        details:
            "A required record was not found. It may not exist in the current company context, or it may be archived.",
    },
    user_error: {
        httpStatus: 422,
        error: "odoo_business_rule",
        details: "Odoo rejected the operation due to a business rule.",
    },
    unknown: {
        httpStatus: 500,
        error: "odoo_error",
        details: null, // filled from err.message at call site
    },
};

/**
 * Classifies an OdooError (or plain Error) into a typed result.
 *
 * @param {OdooError|Error} err
 * @param {object} contextHints  e.g. { model, method, project_id, company_id }
 * @returns {{ kind, httpStatus, error, details, meta }}
 */
export function classifyOdooError(err, contextHints = {}) {
    let kind = "unknown";

    if (err instanceof OdooError) {
        // 1) try data.name (most reliable)
        const n = err.odooName || "";
        for (const [fragment, k] of NAME_RULES) {
            if (n.includes(fragment)) {
                kind = k;
                break;
            }
        }

        // 2) try exception_type (Odoo 16+)
        if (kind === "unknown" && err.odooType) {
            kind = TYPE_MAP[err.odooType] || "unknown";
        }
    }

    // 3) fallback: message patterns (works on plain Error too)
    if (kind === "unknown") {
        for (const [rx, k] of MSG_RULES) {
            if (rx.test(err?.message || "")) {
                kind = k;
                break;
            }
        }
    }

    const base = KIND_META[kind] || KIND_META.unknown;

    return {
        kind,
        httpStatus: base.httpStatus,
        error: base.error,
        details: base.details ?? String(err?.message || err),
        meta: {
            odooName: err instanceof OdooError ? err.odooName : null,
            odooType: err instanceof OdooError ? err.odooType : null,
            ...contextHints,
        },
    };
}