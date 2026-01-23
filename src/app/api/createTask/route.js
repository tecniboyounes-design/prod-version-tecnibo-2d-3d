import axios from "axios";
import { getSessionId } from "../sessionMiddleware";

export async function POST(req) {
  try {
    const {
      title,
      description,
      uid,
      lang,
      company_ids,
      user_companies,
      projectNumber,
    } = await req.json();
    console.log("project number:", projectNumber);

    const fullDescription = `${description} (Project No: ${projectNumber})`;

    const relativePath = "web/dataset/call_kw";
    const url = getAuthenticationUrl(req, relativePath);

    const currentCompanyId =
      user_companies && user_companies.current_company
        ? user_companies.current_company
        : 11;

    const userLang = lang || "en_US";

    const payload = {
      id: 49,
      jsonrpc: "2.0",
      method: "call",
      params: {
        model: "project.task",
        method: "web_save",
        args: [
          [],
          {
            name: title,
            description: fullDescription,
          },
        ],
        kwargs: {
          context: {
            lang: userLang,
            tz: "Africa/Casablanca",
            uid: uid,
            allowed_company_ids: [currentCompanyId],
            default_personal_stage_type_id: 2197,
            params: {
              action: 3281,
              model: "project.task",
              view_type: "kanban",
              cids: currentCompanyId,
              menu_id: 1895,
            },
            tree_view_ref: "project_todo.project_task_view_todo_tree",
          },
          specification: {},
        },
      },
    };

    const session_id = getSessionId(req);
    // console.log("session_id", session_id);

    const response = await axios.post(url, payload, {
      withCredentials: true,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Cookie: `session_id=${session_id}; frontend_lang=fr_BE; _ga=GA1.1.2018524526.1738842422; cids=11; SL_G_WPT_TO=en; SL_GWPT_Show_Hide_tmp=1; tz=Africa/Casablanca; SL_wptGlobTipTmp=1; _ga_E9XFQV20YJ=GS1.1.1739356242.9.0.1739356318.0.0.0`,
      },
    });
    console.log("res from odoo server:", response);

    return new Response(JSON.stringify(response.data.result), { status: 200 });
  } catch (error) {
    return new Response(
      JSON.stringify({
        message: "Error creating project task",
        error: error.message,
      }),
      { status: 500 }
    );
  }
}
