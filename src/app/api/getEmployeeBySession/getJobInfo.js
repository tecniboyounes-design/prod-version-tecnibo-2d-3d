/**
 * Generates a JSON-RPC payload to retrieve detailed employee information from Odoo's `hr.employee` model.
 * This payload is designed for the `web_search_read` method, ensuring it aligns with the given network payload.
 *
 * @param {number} uid - The user ID (from the session) to locate the corresponding employee record.
 * @param {number} companyId - The company ID to set in the context for authorization.
 * @returns {Object} A JSON-RPC payload object compatible with Odoo's RPC framework.
 */



export function createEmployeePayloadByUserId(uid, companyId) {
  return {
    jsonrpc: "2.0",
    method: "call",
    params: {
      model: "hr.employee",
      method: "search_read",
      args: [[["user_id", "=", uid]]],
      kwargs: {
        fields: ["id", "job_title"],
        limit: 1,
        context: {
          lang: "en_US",
          tz: "Africa/Casablanca",
          uid: uid,
          allowed_company_ids: [companyId],
          bin_size: true,
          params: {
            action: 445,
            model: "hr.employee",
            view_type: "kanban",
            cids: companyId,
            menu_id: 304
          },
          chat_icon: true
        }
      }
    },
    id: Date.now()
  };
}





  /**
   * Retrieves the job position details for an employee based on the given user ID.
   *
   * @param {number} uid - The user ID associated with the employee.
   * @param {string} session_id - The session ID for authentication.
   * @returns {Promise<string>} The job position title of the employee.
   */


/**
 * Retrieves the job position details for an employee based on the given user ID.
 *
 * @param {number} uid - The user ID associated with the employee.
 * @param {string} session_id - The session ID for authentication.
 * @param {number} companyId - The company ID to include in the request.
 * @returns {Promise<Object>} The full response from Odoo containing job position details.
 */
  

export async function getJobPositionDetails(uid, session_id, companyId) {
  console.log("Starting getJobPositionDetails with user ID:", uid, "session ID:", session_id, "company ID:", companyId);
  const payload = createEmployeePayloadByUserId(uid, companyId);
  console.log("Payload ready to send:", payload);

  const options = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Cookie": `session_id=${session_id}`
    },
    body: JSON.stringify(payload)
  };

  console.log("Request options prepared:", options);
  
  try {
    console.log("Sending request to Odoo...");
    const response = await fetch("http://192.168.30.33:8069/web/dataset/call_kw/hr.employee/search_read", options);
    console.log("Response received with status:", response.status);

    if (!response.ok) {
      console.error("HTTP error occurred! Status:", response.status);
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const text = await response.text();
    console.log("Raw response text:", text);
    const data = JSON.parse(text);
    console.log("Parsed response data:", data);

    if (data.error) {
      console.error("Odoo API error:", data.error.message);
      throw new Error(data.error.message);
    }

    console.log("Job position details retrieved successfully");
    return data;
  } catch (error) {
    console.error("Error in getJobPositionDetails:", error.message);
    throw error;
  }
}

  