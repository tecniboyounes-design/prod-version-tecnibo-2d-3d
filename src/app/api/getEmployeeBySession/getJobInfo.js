/**
 * Generates a JSON-RPC payload to retrieve detailed employee information from Odoo's `hr.employee` model.
 * This payload is designed for the `web_search_read` method, ensuring it aligns with the given network payload.
 *
 * @param {number} uid - The user ID (from the session) to locate the corresponding employee record.
 * @returns {Object} A JSON-RPC payload object compatible with Odoo's RPC framework.
 */
export function createEmployeePayloadByUserId(uid) {
    return {
      jsonrpc: "2.0",
      method: "call",
      params: {
        model: "hr.employee",
        method: "web_search_read", // Match the given payload's method
        args: [],
        kwargs: {
          specification: {
            id: {},
            job_title: {} // Extracting job title instead of job_id
          },
          domain: [["user_id", "=", uid]], // Filtering by user_id
          offset: 0,
          order: "",
          limit: 1, // We only need one result
          context: {
            lang: "en_US",
            tz: "Africa/Casablanca",
            uid: uid,
            allowed_company_ids: [11],
            bin_size: true,
            params: {
              action: 445,
              model: "hr.employee",
              view_type: "kanban",
              cids: 11,
              menu_id: 304
            },
            chat_icon: true
          },
          count_limit: 10001
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


export async function getJobPositionDetails(uid, session_id) {
    // Create the payload
    const payload = createEmployeePayloadByUserId(uid);

    // Prepare request options
    const options = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Cookie": `session_id=${session_id}` 
      },
      body: JSON.stringify(payload)
    };

    try {
      // console.log("🚀 Sending request to Odoo...");
      const response = await fetch("http://192.168.30.33:8069/web/dataset/call_kw/hr.employee/search_read", options);
      
      // console.log("🔄 Response Object:", response);
       
      if (!response.ok) { 
        console.error(`❌ HTTP error! Status: ${response.status}`);
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      // console.log("✅ Response received! Parsing data...");
      const text = await response.text();
      // console.log("📜 Raw Response Text:", text);

      const data = JSON.parse(text);
      
      // console.log("📦 Parsed Response Data:", data);

      if (data.error) {
        console.error("⚠️ Odoo API Error:", data.error.message);
        throw new Error(data.error.message);
      }

      return data; // Return the full response from Odoo
    } catch (error) {
      console.error("❌ Error in getJobPositionDetails:", error);
      throw error;
    }
}

  