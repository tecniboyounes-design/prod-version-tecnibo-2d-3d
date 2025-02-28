export function createPayload() {
    const domain = [
        "|", 
        ["name", "ilike", ""],  // Empty string will fetch all project names
        ["code", "ilike", ""],  // Empty string will fetch all project codes
    ];

    const payload = {
        id: 71,
        jsonrpc: "2.0",
        method: "call",
        params: {
            model: "project.project",
            method: "web_search_read",
            args: [],
            kwargs: {
                specification: {
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
                    id: {}
                },
                offset: 0,
                order: "is_favorite DESC, sequence ASC, name ASC, id ASC",
                limit: 80,
                context: {
                    lang: "en_US",
                    tz: "Africa/Casablanca",
                    uid: 447,
                    allowed_company_ids: [11],
                    bin_size: true,
                    params: {
                        action: 669,
                        model: "project.project",
                        view_type: "kanban",
                        cids: 11,
                        menu_id: 473
                    },
                    current_company_id: 11
                },
                count_limit: 10001,
                domain
            }
        }
    };

    return JSON.stringify(payload);
}
