const PROJECT_SPECIFICATION = {
  display_name: {},
  partner_id: { fields: { display_name: {} } },
  allow_timesheets: {},
  allow_billable: {},
  warning_employee_rate: {},
  sale_order_id: { fields: {} },
  pricing_type: {},
  remaining_hours: {},
  encode_uom_in_days: {},
  allocated_hours: {},
  color: {},
  task_count: {},
  phase_count: {},
  closed_task_count: {},
  open_task_count: {},
  milestone_count_reached: {},
  milestone_count: {},
  allow_milestones: {},
  label_tasks: {},
  alias_email: {},
  is_favorite: {},
  rating_count: {},
  rating_avg: {},
  rating_status: {},
  rating_active: {},
  analytic_account_id: { fields: { display_name: {} } },
  date: {},
  privacy_visibility: {},
  last_update_color: {},
  last_update_status: {},
  tag_ids: { fields: { display_name: {}, color: {} } },
  sequence: {},
  use_documents: {},
  date_start: {},
  total_planned_amount: {},
  total_budget_progress: {},
  activity_ids: { fields: {} },
  activity_exception_decoration: {},
  activity_exception_icon: {},
  activity_state: {},
  activity_summary: {},
  activity_type_icon: {},
  activity_type_id: { fields: { display_name: {} } },
  user_id: { fields: { display_name: {} } },
  display_planning_timesheet_analysis: {},
  id: {},
};

function asId(value) {
  if (value == null) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string") {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  if (Array.isArray(value)) return asId(value[0]);
  if (typeof value === "object") return asId(value.id);
  return null;
}

function uniqNums(input) {
  return Array.from(new Set((input || []).map(Number).filter(Number.isFinite)));
}

function sanitizeLimit(limit) {
  if (
    limit == null ||
    limit === false ||
    limit === 0 ||
    limit === "0" ||
    String(limit).toLowerCase() === "all"
  ) {
    return false;
  }

  const n = Number(limit);
  if (!Number.isFinite(n) || n <= 0) return false;
  return Math.min(n, 5000);
}

function sanitizeOffset(offset) {
  const n = Number(offset);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.floor(n);
}

function deriveContext({ sessionInfo = {}, companyId }) {
  const uc = sessionInfo?.user_context || {};
  const companies = sessionInfo?.user_companies || {};

  const allowedFromUserContext = uniqNums(
    Array.isArray(uc.allowed_company_ids) ? uc.allowed_company_ids : []
  );
  const allowedFromCompanyMap = uniqNums(
    Object.keys(companies?.allowed_companies || {}).map(Number)
  );

  const allowedCompanyIds = allowedFromUserContext.length
    ? allowedFromUserContext
    : allowedFromCompanyMap;

  const overrideCompanyId = asId(companyId);
  const userContextCompanyId = asId(uc.allowed_company_id ?? uc.company_id);
  const currentCompanyFromSession = asId(companies.current_company);

  let currentCompanyId = null;
  if (overrideCompanyId && allowedCompanyIds.includes(overrideCompanyId)) {
    currentCompanyId = overrideCompanyId;
  } else if (
    userContextCompanyId &&
    allowedCompanyIds.includes(userContextCompanyId)
  ) {
    currentCompanyId = userContextCompanyId;
  } else if (
    currentCompanyFromSession &&
    allowedCompanyIds.includes(currentCompanyFromSession)
  ) {
    currentCompanyId = currentCompanyFromSession;
  } else {
    currentCompanyId = allowedCompanyIds[0] ?? null;
  }

  return {
    uid: asId(uc.uid) ?? asId(sessionInfo.uid) ?? null,
    lang: uc.lang || "en_US",
    tz: uc.tz || "Africa/Casablanca",
    allowedCompanyIds,
    currentCompanyId,
    baseUserContext: uc,
  };
}

function buildDomain(projectName) {
  const q = typeof projectName === "string" ? projectName.trim() : "";
  if (!q) return [];

  return [
    "|",
    ["name", "ilike", q],
    ["code", "ilike", q],
  ];
}

export function createPayload({
  projectName = "",
  limit = false,
  offset = 0,
  sessionInfo = {},
  companyId,
} = {}) {
  const {
    uid,
    lang,
    tz,
    allowedCompanyIds,
    currentCompanyId,
    baseUserContext,
  } = deriveContext({
    sessionInfo,
    companyId,
  });

  const baseParams =
    baseUserContext?.params && typeof baseUserContext.params === "object"
      ? baseUserContext.params
      : {};

  const context = {
    ...baseUserContext,
    lang,
    tz,
    ...(uid ? { uid } : {}),
    ...(allowedCompanyIds.length
      ? { allowed_company_ids: allowedCompanyIds }
      : {}),
    ...(currentCompanyId
      ? {
          allowed_company_id: currentCompanyId,
          company_id: currentCompanyId,
          current_company_id: currentCompanyId,
        }
      : {}),
    bin_size: true,
    params: {
      ...baseParams,
      model: "project.project",
      view_type: "kanban",
      ...(currentCompanyId ? { cids: currentCompanyId } : {}),
    },
  };

  return {
    id: Date.now(),
    jsonrpc: "2.0",
    method: "call",
    params: {
      model: "project.project",
      method: "web_search_read",
      args: [],
      kwargs: {
        specification: PROJECT_SPECIFICATION,
        offset: sanitizeOffset(offset),
        order: "is_favorite DESC, sequence ASC, name ASC, id ASC",
        limit: sanitizeLimit(limit),
        context,
        count_limit: 100000,
        domain: buildDomain(projectName),
      },
    },
  };
}
