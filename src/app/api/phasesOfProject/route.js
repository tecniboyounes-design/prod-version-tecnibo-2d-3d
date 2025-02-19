import axios from 'axios';
import { createPayload } from './preparePhasesPayload';
import { getSessionId } from '../sessionMiddleware';

export async function POST(req) {
    console.log("Incoming request:", req);

    try {
        const requestData = await req.json();
        
        // Extract parameters from the request
        const { projectId } = requestData;
        
        console.log("Received request data:", requestData);

        // Generate the payload for the request
        const payload = createPayload(projectId);
        
        console.log("Generated payload:", payload);
        
        // Odoo server URL (adjust as necessary)
        const url = "http://192.168.30.33:8069/web/dataset/call_kw/project.phase/web_search_read";
   
        // Example session ID (replace with actual session or handle authentication)
    const session_id = getSessionId(req);
    console.log('session_id', session_id);
    
         
        // Send POST request to Odoo server 
        const response = await axios.post(url, payload, {
            withCredentials: true,
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json",
                "Cookie": `session_id=${session_id}; frontend_lang=en_US; tz=Africa/Casablanca`
            }
        });

        console.log("Odoo response received:", response.data);

        // Check for errors in the Odoo response
        if (response.data.error) {
            console.error('Error details from Odoo:', response.data.error);
            return Response.json(
                { message: 'Error creating sale order', error: response.data.error },
                { status: 500 }
            );
        }

        // Send the successful response back to the client
        return Response.json(response.data.result, { status: 200 });

    } catch (error) {
        console.error('Caught error:', error);
        return Response.json(
            { message: 'Error creating sale order', error: error.message },
            { status: 500 }
        );
    }
}
