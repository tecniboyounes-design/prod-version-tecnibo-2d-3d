import axios from 'axios';
import { createEmployeePayload } from './odooPayload';

export async function POST(req) {

    const { employeeId } = req.body;
    
    // Validate input
    if (!employeeId || !sessionId) {
        return res.status(400).json({ error: "Missing employeeId or sessionId" });
    }
    
    if (!Number.isInteger(employeeId)) {
        return res.status(400).json({ error: "employeeId must be an integer" });
    }
    

    const sessionId = '966f8b986aa440d31e580967efaeb059f9e13367'
    
    
    try {
        // Send request to Odoo server using Axios
        const response = await axios.post(
            "http://192.168.30.33:8069/web/dataset/call_kw/hr.employee/web_read",
            createEmployeePayload(employeeId),
            {
                headers: {
                    "Content-Type": "application/json",
                    "Cookie": `session_id=${sessionId}`
                }
            }
        );

        // Get the response data
        const data = response.data;

        // Check for JSON-RPC errors
        if (data.error) {
            return res.status(500).json({ error: data.error });
        }

        // Check if employee data was found
        if (data.result.length === 0) {
            return res.status(404).json({ error: "Employee not found" });
        }

        // Return the employee information (first item in the result array)
        return res.status(200).json(data.result[0]);
    } catch (error) {
        // Handle Axios errors
        if (error.response) {
            // Server responded with a status code outside 2xx
            return res.status(error.response.status).json({ error: error.response.data });
        } else if (error.request) {
            // Request was made but no response received
            return res.status(500).json({ error: "No response from server" });
        } else {
            // Error setting up the request
            return res.status(500).json({ error: error.message });
        }
    }
    

}