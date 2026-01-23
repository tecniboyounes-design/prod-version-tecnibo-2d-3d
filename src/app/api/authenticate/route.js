// src/app/api/authenticate/route.js
import { getCorsHeaders, handleCorsPreflight } from "@/lib/cors";
import fs from "fs"; // Import the built-in fs module
import { supabase } from "../filesController/route";

const ODOO_URL = process.env.ODOO_URL;
const DATABASE_NAME = process.env.ODOO_DB;
if (!ODOO_URL) throw new Error("[authenticate] ODOO_URL env is required");
if (!DATABASE_NAME) throw new Error("[authenticate] ODOO_DB env is required");

// Function to append a log entry to the JSON file
function appendToLogFile(logEntry) {
  const logFilePath = "auth-logs.json";
  let logs = [];

  // Read the existing log file, if it exists
  try {
    const fileContent = fs.readFileSync(logFilePath, "utf8");
    if (fileContent) {
      logs = JSON.parse(fileContent);
    }
  } catch (error) {
    // If the file doesn't exist or is invalid, start with an empty array
    logs = [];
  }

  // Append the new log entry
  logs.push(logEntry);

  // Write the updated logs back to the file
  try {
    fs.writeFileSync(logFilePath, JSON.stringify(logs, null, 2), "utf8");
  } catch (error) {
    console.error("Failed to write to log file:", error);
  }
}

// 🔥 Sync users.is_super_admin in Supabase based on Odoo profile
// - If user exists (matched by odoo_id) -> only update is_super_admin
// - If user does NOT exist -> create it with name, email, odoo_id, is_super_admin
async function syncUserSuperAdminFromOdoo(email, odooResult) {
  if (!odooResult) return;

  const uid = odooResult.uid;
  if (!uid) return;

  const {
    is_system = false,
    is_admin = false,
    name,
    username,
  } = odooResult;

  const isSuperAdmin = !!(is_system && is_admin);

  // Make sure "name" is never null (NOT NULL constraint)
  const displayName = name || username || email || `Odoo User #${uid}`;

  try {
    // 1️⃣ Try to update existing user by odoo_id (only is_super_admin)
    const { data: updatedRows, error: updateError } = await supabase
      .from("users")
      .update({ is_super_admin: isSuperAdmin })
      .eq("odoo_id", uid)
      .select("id");

    if (updateError) {
      console.error(
        "[syncUserSuperAdminFromOdoo] update error:",
        updateError.message,
      );
      return;
    }

    // If at least one row was updated, we are done
    if (updatedRows && updatedRows.length > 0) {
      // console.log("[syncUserSuperAdminFromOdoo] updated existing user", updatedRows[0].id);
      return;
    }

    // 2️⃣ No existing user with this odoo_id -> create a new one
    const { error: insertError } = await supabase.from("users").insert({
      name: displayName,      // NOT NULL
      email,                  // NOT NULL
      odoo_id: uid,           // NOT NULL, UNIQUE
      is_super_admin: isSuperAdmin,
      // avatar: null,        // optional
      // role: null,          // optional
    });

    if (insertError) {
      console.error(
        "[syncUserSuperAdminFromOdoo] insert error:",
        insertError.message,
      );
    } else {
      // console.log("[syncUserSuperAdminFromOdoo] created new user for", email);
    }
  } catch (err) {
    console.error(
      "[syncUserSuperAdminFromOdoo] unexpected error:",
      err.message,
    );
  }
}

export async function OPTIONS(request) {
  console.log("Handling CORS preflight request");
  return handleCorsPreflight(request);
}

export async function POST(request) {
  const corsHeaders = getCorsHeaders(request);
  let email = null;

  try {
    const body = await request.json();
    email = body?.email || null;
    const password = body?.password;

    if (!email || !password) {
      // Log missing credentials
      appendToLogFile({
        timestamp: new Date().toISOString(),
        email: email || "unknown",
        result: "failure",
        message: "Missing email or password",
      });
      return new Response(
        JSON.stringify({
          message: "Missing email or password",
          result: false,
        }),
        { status: 400, headers: corsHeaders },
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

    const response = await fetch(
      `${ODOO_URL}/web/session/authenticate`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        credentials: "include",
        body: JSON.stringify(loginData),
      },
    );

    const data = await response.json();
    const odooResult = data?.result;

    // ⬇️ Sync users.is_super_admin in Supabase
    if (odooResult) {
      await syncUserSuperAdminFromOdoo(email, odooResult);
    }

    // Log the login result
    appendToLogFile({
      timestamp: new Date().toISOString(),
      email: email || "unknown",
      result: data?.result ? "success" : "failure",
      message: data?.result
        ? "Authentication succeeded"
        : "Authentication failed",
      response: data,
    });

    const setCookie = response.headers.get("set-cookie");
    let sessionId = null;

    if (setCookie) {
      const match = setCookie.match(/session_id=([^;]+)/);
      sessionId = match ? match[1] : null;
    }
    
    const isSecure = process.env.NODE_ENV === "production" ? "; Secure" : "";
    const cookieHeader = sessionId
      ? `session_id=${sessionId}; Path=/; HttpOnly; SameSite=Lax${isSecure}`
      : null;
    
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
            ...corsHeaders,
            ...(cookieHeader && { "Set-Cookie": cookieHeader }),
          },
        },
      );
    } else {
      const failureMessage =
        data?.error?.data?.message ||
        data?.error?.message ||
        data?.message ||
        "Request failed";
      return new Response(
        JSON.stringify({
          message: failureMessage,
          result: false,
          response: data,
        }),
        { status: response?.status || 400, headers: corsHeaders },
      );
    }
  } catch (error) {
    
    // Log any errors during the authentication process
    appendToLogFile({
      timestamp: new Date().toISOString(),
      email: email || "unknown",
      result: "error",
      message: "Internal server error",
      error: error.message,
    });
    return new Response(
      JSON.stringify({
        message: "Internal server error",
        result: false,
        error: error.message,
      }),
      { status: 500, headers: corsHeaders },
    );
  }
}
