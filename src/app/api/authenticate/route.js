import { getAuthenticationUrl } from "../redirect";

const DATABASE_NAME = "tecnibo17_test"; 

// Allowed origins
const allowedOrigins = ["http://localhost:5173", "https://tecnibo-six.vercel.app", "http://localhost:3000",];

export function getCorsHeaders(origin) {
    
    if (!allowedOrigins.includes(origin)) {
        // If the origin is not allowed, stop and return an error response
        return new Response(
            JSON.stringify({ message: "Forbidden: Origin not allowed" }),
            { status: 403, headers: { 
                "Content-Type": "application/json", 
                "Access-Control-Allow-Origin": "null",
                "Access-Control-Allow-Methods": "POST, GET",
                "Access-Control-Allow-Headers": "Content-Type"
            }}
        );
    }

    // If the origin is allowed, return normal CORS headers
    return {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Methods": "POST, GET",
        "Access-Control-Allow-Headers": "Content-Type",
        "Content-Type": "application/json",
    };
}



export async function POST(request) {
    const origin = request.headers.get("origin");
    const headers = getCorsHeaders(origin);
    
    try {
        const { email, password } = await request.json();
        // console.log("Received email:", email);
        // console.log("Received password:", password);

        if (!email || !password) {
            return new Response(
                JSON.stringify({ message: "Missing email or password", result: false }),
                { status: 400, headers }
            );
        }

        const loginData = {
            jsonrpc: "2.0",
            method: "call",
            params: {
                db: DATABASE_NAME,
                login: email,
                password: password,
            },
            id: 1,
        }; 
        
        const authUrl = getAuthenticationUrl(request, "web/session/authenticate");
        const response = await fetch(authUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
            },
            credentials: "include",
            body: JSON.stringify(loginData),
        });
        
        const data = await response.json();
        const setCookie = response.headers.get("set-cookie");
        let sessionId = null;

        if (setCookie) {
            const match = setCookie.match(/session_id=([^;]+)/);
            if (match) {
                sessionId = match[1];
            }
        }

        if (data?.result) {
            return new Response(
                JSON.stringify({
                    message: "Request succeeded",
                    result: true,
                    session_id: sessionId,
                    response: data,
                }),
                {
                    status: 200,
                    headers: {
                        ...headers,
                        "Set-Cookie": `session_id=${sessionId}; Path=/; HttpOnly; Secure; SameSite=Strict`,
                    },
                }
            );
        } else {
            return new Response(
                JSON.stringify({ message: "Request failed", result: false, response: data }),
                { status: 400, headers }
            );
        }
    } catch (error) {
        console.error("Error occurred during authentication:", error);

        return new Response(
            JSON.stringify({ message: "Error occurred", result: false, error: error.message }),
            { status: 500, headers }
        );
    }
}

