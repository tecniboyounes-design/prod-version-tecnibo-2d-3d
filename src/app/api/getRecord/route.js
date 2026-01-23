import axios from 'axios';
import { getSessionId } from '../sessionMiddleware';

const ODOO_URL = process.env.ODOO_URL
  ? `${process.env.ODOO_URL}/mail/thread/data`
  : null;
if (!ODOO_URL) throw new Error("[getRecord] ODOO_URL env is required");

export async function POST(req) {
    
    // Set the payload for the API request
    const payload = {
        "id": 28,
        "jsonrpc": "2.0",
        "method": "call",
        "params": {
            "request_list": ["followers", "attachments", "suggestedRecipients", "activities"], 
            "thread_id": 213590,  
            "thread_model": "project.task",  
        }
    };

    // Extract session_id from cookies or assume it's available
    const session_id = getSessionId(req);
    console.log('session_id', session_id);


    try {
        // Send the POST request with credentials (cookies)
        const response = await axios.post(ODOO_URL, payload, {
            withCredentials: true,  
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json",
                "Cookie": `session_id=${session_id}; frontend_lang=fr_BE; _ga=GA1.1.2018524526.1738842422; cids=11; SL_G_WPT_TO=en; SL_GWPT_Show_Hide_tmp=1; tz=Africa/Casablanca; SL_wptGlobTipTmp=1; _ga_E9XFQV20YJ=GS1.1.1739356242.9.0.1739356318.0.0.0`, 
            }
        });

        console.log('response:', response);

        // Return the response directly from the API route
        return new Response(JSON.stringify(response.data.result), { status: 200 });
    } catch (error) {
        console.error('Error:', error);
        return new Response(JSON.stringify({ message: 'Error fetching data', error: error.message }), { status: 500 });
    }
}
