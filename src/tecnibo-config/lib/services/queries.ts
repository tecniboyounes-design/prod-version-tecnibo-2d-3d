import axios from "axios";

// Use a relative base in the browser. For SSR, fall back to site URL if provided.
const API_BASE =
  typeof window !== "undefined" ? "" : process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

// Types
export interface QueryExecuteRequest { db: string; query: string; }
export interface QueryExecuteResponse { code?: string; id?: string; }
export interface PreviewDataResponse { [key: string]: any; }

// Keep exec via proxy
const executeQuery = async (data: QueryExecuteRequest): Promise<QueryExecuteResponse> => {
  const response = await axios.post(`${API_BASE}/api/builder/meta/q/exec`, data, {
    headers: { "Content-Type": "application/json" },
  });
  const { code, id } = response.data || {};
  return { code, id };
};

// Keep preview via proxy GET
const getPreviewData = async (code: string): Promise<PreviewDataResponse> => {
  const response = await axios.get(`${API_BASE}/api/builder/meta/q/${code}`);
  return response.data;
};

// Same shape as before
const generateEndpoint = async (database: string, query: string) => {
  const executeResult = await executeQuery({ db: database, query });
  const code = executeResult.code || executeResult.id;
  if (!code) throw new Error("No code returned from query execution");
  const previewData = await getPreviewData(code);
  return { success: true, code, previewData, source: `meta/q/${code}` };
};

// ✅ Updated to hit your proxy instead of the microservice
//    and to return .data for consistency
const showOptionsData = async (source: string) => {
  // source comes from `generateEndpoint().source` = `meta/q/${code}`
  // Normalize to avoid accidental leading slashes or path traversal
  const clean = String(source).replace(/^\/+/, "").replace(/\.\.(\/|\\)/g, "");
  const url = `${API_BASE}/api/builder/${clean}`;
  const response = await axios.get(url);
  return response;
};

export const queriesServices = {
  executeQuery,
  getPreviewData,
  generateEndpoint,
  showOptionsData,
};
