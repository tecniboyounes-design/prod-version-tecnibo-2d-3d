import axios from "axios";
import { createPayload } from "./searchProjectPayload";
import { getSessionId } from "../sessionMiddleware";
import { getAuthenticationUrl } from "../redirect";

export async function POST(req) {

  try {
    // Extract request data
    const request = await req.json();
    console.log("Incoming request:", request);
    const session_id = getSessionId(req);
    // console.log('session Test', session_id);

    const { projectName = "Default Project", reference = null } = request;

     
    if (!session_id) {
      console.error("Session ID not found in cookies");
      return new Response(
        JSON.stringify({
          message: "Unauthorized: Missing session ID",
        }),
        { status: 401 }
      );
    }
   
     
          
          const relativePath = "web/dataset/call_kw/project.project/web_search_read";
          const url = getAuthenticationUrl(req, relativePath);
      
    // Create JSON payload
    const jsonPayload = JSON.parse(createPayload(projectName, reference));
    
    // Send POST request to Odoo server
    const response = await axios.post(url, jsonPayload, {
      withCredentials: true,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Cookie: `session_id=${session_id}; frontend_lang=fr_BE; tz=Africa/Casablanca`,
      },
    });

    // 

    console.log("Response from Odoo server:", response.data);

    if (response.data.error) {
      console.error("Odoo API Error:", response.data.error);
      return new Response(
        JSON.stringify({
          message: "Error fetching projects from Odoo",
          error: response.data.error,
        }),
        { status: 500 }
      );
    }

    return new Response(JSON.stringify(response.data.result), { status: 200 });
  } catch (error) {
    console.error("Request Error:", error.message);

    return new Response(
      JSON.stringify({
        message: "Error fetching projects",
        error: error.message,
      }),
      { status: 500 }
    );
  }
}
