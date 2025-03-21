export function getAuthenticationUrl(req, relativePath) {
    console.log('request:', req);
    const host = req.headers.get("host");
    const isLocalhost = host.includes("localhost") || host.includes("192.168.");

    if (isLocalhost) {
        return `http://192.168.30.33:8069/${relativePath}`; // Fixed local URL
    }

    return `https://tecnibo.com/${relativePath}`; // Production environment URL
}
