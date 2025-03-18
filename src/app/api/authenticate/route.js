import { getAuthenticationUrl } from "../redirect";

export async function POST(request) {
    // console.log("Received request:", request);
    const { email, password } = await request.json();
    // console.log("Received email:", email, "Password:", password);
    
    const loginData = {
        jsonrpc: "2.0",
        method: "call",
        params: {
            db: "tecnibo17_test",
            login: email,
            password: password,
        },
        id: 1,
    };
    
    try {
        const relativePath = "web/session/authenticate"; 
        const authUrl = getAuthenticationUrl(request, relativePath); 
        const response = await fetch(authUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json",
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
                        "Content-Type": "application/json",
                        "Set-Cookie": `session_id=${sessionId}; Path=/; HttpOnly; Secure; SameSite=Strict`,
                    },
                }
            );
        } else {
            return new Response(
                JSON.stringify({
                    message: "Request failed",
                    result: false,
                    response: data,
                }),
                { status: 400 }
            );
        }

    } catch (error) {
        console.error("Error occurred during authentication:", error);

        return new Response(
            JSON.stringify({
                message: "Error occurred",
                result: false,
                error: error.message,
            }),
            { status: 500 }
        );
    }
}
