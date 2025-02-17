export async function POST(request) {
    const { email, password } = await request.json();

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

        
        console.log('response', response);
        
        const data = await response.json(); 
        const setCookie = response.headers.get("set-cookie");

        if (data?.result) {
            const headers = new Headers({
                "Content-Type": "application/json",
            });

            if (setCookie) {
                headers.append("Set-Cookie", setCookie); 
            }

            return new Response(
                JSON.stringify({
                    message: "Request succeeded",
                    result: true,
                    response: data,
                }),
                { status: 200, headers }
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
