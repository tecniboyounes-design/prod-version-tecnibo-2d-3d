export async function POST(request) {
    const { email, password } = await request.json();

    // Logging the incoming request
    console.log("Received request with data:", { email, password });

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
        const response = await fetch("http://192.168.30.33:8069/web/session/authenticate", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json",
            },
            credentials: "include",
            body: JSON.stringify(loginData),
        });

        const data = await response.json();

        // Log the response from Odoo API
        console.log("Response from Odoo API:", data);

        // Check if the response contains the 'result' key
        if (data?.result) {
            return new Response(
                JSON.stringify({
                    message: "Request succeeded",
                    result: true,
                    response: data,
                }),
                { status: 200 }
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
        // Log error details
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
