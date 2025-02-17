import axios from "axios";
import { createPayload } from "./searchProjectPayload";

export async function POST(req) {
  try {
    // Extract request data
    const request = await req.json();
    console.log("Incoming request:", request);

    const { projectName = "Default Project", reference = null } = request;

    // Define the API endpoint
    const url =
      "http://192.168.30.33:8069/web/dataset/call_kw/project.project/web_search_read";

    // Example session ID (Replace with an actual session ID or authentication handling)
    const session_id = "9568641c9f90e353448665cdd01e308598e1b9c6";

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
 