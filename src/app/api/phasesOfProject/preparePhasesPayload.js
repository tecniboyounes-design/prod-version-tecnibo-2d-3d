export function createPayload(projectId) {
  return {
    id: 17,
    jsonrpc: "2.0",
    method: "call",
    params: {
      model: "project.phase",
      method: "web_search_read",
      args: [],
      kwargs: {
        specification: {
          code: {},
          project_type: {},
          name: {},
          project_id: {
            fields: {
              display_name: {}
            }
          },
          date_start: {},
          date_end: {}
        },
        offset: 0,
        order: "",
        limit: 80,
        context: {
          lang: "en_US",
          tz: "Africa/Casablanca",
          uid: 447,
          allowed_company_ids: [11],
          bin_size: true,
          params: {
            id: projectId,
            cids: 11,
            menu_id: 473,
            action: 669,
            model: "project.project",
            view_type: "form"
          },
          active_model: "project.project",
          active_id: projectId,
          active_ids: [projectId],
          default_project_id: projectId,
          current_company_id: 11
        },
        count_limit: 10001,
        domain: [
          "&",
          ["project_id", "=", projectId],
          ["project_id", "=", projectId]
        ]
      }
    }
  };
}
