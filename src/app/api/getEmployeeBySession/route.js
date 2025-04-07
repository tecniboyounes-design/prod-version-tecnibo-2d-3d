import { getJobPositionDetails } from "./getJobInfo";

export async function GET(request) {
    console.log('Starting GET request to fetch session info', request.headers);

    const sessionId = request.headers.get("session_id");
    console.log(`Extracted session ID: ${sessionId}`);

    if (!sessionId) {
        console.log('Validation failed: No session ID provided');
        return new Response(JSON.stringify({ error: "Missing session ID" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
        });
    }

    const options = {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${sessionId}`,
        },
        body: JSON.stringify({
            "jsonrpc": "2.0",
            "method": "call",
            "params": {},
            "id": 1
        }),
    };

    try {
        console.log('Sending request to Odoo session endpoint at http://192.168.30.33:8069/web/session/get_session_info');
        const response = await fetch(
            "http://192.168.30.33:8069/web/session/get_session_info",
            options
        );

        if (!response.ok) {
            console.log(`HTTP request failed with status: ${response.status}`);
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        console.log('Received session info from Odoo server, parsing JSON');
        const data = await response.json();
        console.log('Parsed session info:', data);

        if (data.error) {
            console.log('JSON-RPC error detected:', data.error.message);
            return new Response(JSON.stringify({ error: data.error.message }), {
                status: 500,
                headers: { "Content-Type": "application/json" },
            });
        }

        const uid = data.result.uid;
        if (!uid) {
            console.log('No user ID found in session info');
            return new Response(JSON.stringify({ error: "User not found in session" }), {
                status: 404,
                headers: { "Content-Type": "application/json" },
            });
        }

        console.log('User ID found:', uid);

        // Fetch job position details
        console.log('Fetching job position details for user ID:', uid);
        const jobPosition = await getJobPositionDetails(uid, sessionId);

        console.log('Job position details:', jobPosition);

        return new Response(JSON.stringify({
            uid,
            session_info: data.result,
            job_position: jobPosition
        }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });

    } catch (error) {
        console.log('Error occurred during request:', error.message);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
}
