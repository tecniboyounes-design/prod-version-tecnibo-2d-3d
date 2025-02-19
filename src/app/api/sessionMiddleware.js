export function getSessionId(req) {
    const cookieHeader = req.headers.get("cookie") || "";
    const sessionMatch = cookieHeader.match(/session_id=([^;]+)/);
    return sessionMatch ? sessionMatch[1] : null;
}


