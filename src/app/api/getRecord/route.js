import axios from 'axios';

export async function POST(req) {
    // Set the URL for the API request
    const url = "http://192.168.30.33:8069/mail/thread/data";
    
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
    const session_id = "9568641c9f90e353448665cdd01e308598e1b9c6"; 

    try {
        // Send the POST request with credentials (cookies)
        const response = await axios.post(url, payload, {
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
