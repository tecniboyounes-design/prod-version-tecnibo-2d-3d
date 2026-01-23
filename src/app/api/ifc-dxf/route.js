// /app/api/ifc-dxf/route.js
// IFC + 3D DXF endpoint reusing the minimal IFC writer and the 3D DXF writer.
import { buildIFCWithOpts } from "../ifc/minimal-writer";
import { buildDXFFromElements } from "./minimal-dxf-writer";
import { getCorsHeaders, handleCorsPreflight } from "@/lib/cors";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const CLOUDCONVERT_API_KEY = process.env.CLOUDCONVERT_API_KEY;
const CLOUDCONVERT_USE_SANDBOX =
  String(process.env.CLOUDCONVERT_USE_SANDBOX || "false").toLowerCase() ===
  "true";
const CLOUDCONVERT_BASE_URL = CLOUDCONVERT_USE_SANDBOX
  ? "https://api-sandbox.cloudconvert.com/v2"
  : "https://api.cloudconvert.com/v2";

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));



async function convertDxfToDwg({ dxfText, fileName }) {
  if (!CLOUDCONVERT_API_KEY) {
    console.error("[CloudConvert] Missing API key in env");
    throw new Error("CLOUDCONVERT_API_KEY is not configured");
  }

  console.log("[CloudConvert] Starting DXF → DWG", {
    filename: fileName,
    baseUrl: CLOUDCONVERT_BASE_URL,
    useSandbox: CLOUDCONVERT_USE_SANDBOX,
  });

  const safeInput =
    typeof fileName === "string" && fileName.trim().length > 0
      ? fileName.trim()
      : "export.dxf";
  let inputName = safeInput;
  if (/\.dwg$/i.test(inputName)) {
    inputName = inputName.replace(/\.dwg$/i, ".dxf");
  } else if (!/\.dxf$/i.test(inputName)) {
    inputName = `${inputName}.dxf`;
  }
  const outputName = inputName.replace(/\.dxf$/i, ".dwg");
  const dxfBase64 = Buffer.from(dxfText, "utf8").toString("base64");

  const jobRes = await fetch(`${CLOUDCONVERT_BASE_URL}/jobs`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${CLOUDCONVERT_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      tasks: {
        "import-dxf": {
          operation: "import/base64",
          file: dxfBase64,
          filename: inputName,
        },
        "convert-dwg": {
          operation: "convert",
          input: ["import-dxf"],
          output_format: "dwg",
        },
        "export-dwg": {
          operation: "export/url",
          input: ["convert-dwg"],
          inline: false,
          archive_multiple_files: false,
        },
      },
    }),
  });

  const jobJson = await jobRes.json().catch(() => null);
  console.log("[CloudConvert] Job create response:", {
    status: jobRes.status,
    ok: jobRes.ok,
    body: jobJson,
  });

  if (!jobRes.ok || !jobJson?.data?.id) {
    const message =
      jobJson?.message ||
      jobJson?.error ||
      jobJson?.data?.message ||
      "Failed to create CloudConvert job";
    throw new Error(message);
  }

  const jobId = jobJson.data.id;
  let exportFile = null;

  for (let attempt = 0; attempt < 8; attempt++) {
    const statusRes = await fetch(`${CLOUDCONVERT_BASE_URL}/jobs/${jobId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${CLOUDCONVERT_API_KEY}`,
      },
    });

    const statusJson = await statusRes.json().catch(() => null);
    console.log("[CloudConvert] Poll attempt", attempt, {
      status: statusRes.status,
      ok: statusRes.ok,
      state: statusJson?.data?.status,
      tasks: statusJson?.data?.tasks?.map((t) => ({
        id: t.id,
        op: t.operation,
        status: t.status,
      })),
    });

    if (!statusRes.ok) {
      const message =
        statusJson?.message ||
        statusJson?.data?.message ||
        "Failed to poll CloudConvert job status";
      throw new Error(message);
    }

    const tasks = statusJson?.data?.tasks || [];
    const failedTask = tasks.find(
      (t) => t?.status === "error" || t?.status === "failed"
    );
    if (failedTask) {
      const message =
        failedTask?.result?.message ||
        failedTask?.message ||
        "CloudConvert conversion failed";
      throw new Error(message);
    }

    const exportTask = tasks.find((t) => t?.operation === "export/url");
    const file = exportTask?.result?.files?.[0];
    if (file?.url) {
      exportFile = file;
      break;
    }

    await delay(1500);
  }

  if (!exportFile?.url) {
    console.error("[CloudConvert] Export URL not found for job", jobId);
    throw new Error("DWG file not ready from CloudConvert");
  }

  const downloadRes = await fetch(exportFile.url);
  if (!downloadRes.ok) {
    throw new Error(
      `Failed to download DWG from CloudConvert (${downloadRes.status})`
    );
  }

  const arrayBuffer = await downloadRes.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString("base64");

  console.log("[CloudConvert] DWG download done", {
    jobId,
    filename: exportFile.filename || outputName,
    size: base64.length,
  });

  return {
    format: "dwg",
    fileName: exportFile.filename || outputName,
    url: exportFile.url,
    jobId,
    base64,
  };
}








export async function POST(req) {
  const corsHeaders = getCorsHeaders(req);
  
  try {
    const bodyUnknown = await req.json().catch(() => null);
    console.log("[IFC-DXF] Received request body:", bodyUnknown);

    if (!bodyUnknown || typeof bodyUnknown !== "object") {
      return new Response("Invalid JSON body", {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "text/plain; charset=utf-8",
        },
      });
    }

    const body = bodyUnknown;

    const requestedFormat =
      typeof body.exportFormat === "string"
        ? body.exportFormat
        : typeof body.targetFormat === "string"
        ? body.targetFormat
        : undefined;
    const exportFormat =
      requestedFormat && requestedFormat.toLowerCase() === "dwg"
        ? "dwg"
        : "dxf";
    const fileName =
      typeof body.fileName === "string" && body.fileName.trim().length > 0
        ? body.fileName.trim()
        : undefined;

    const projectName = String(body.projectName ?? "Roometry Project");
    const schema = body.schema === "IFC2X3" ? "IFC2X3" : "IFC4";
    let format = body.format === "brep" ? "brep" : "tfs";
    if (schema === "IFC2X3") format = "brep";
  
    const bakeWorld = Boolean(body.bakeWorld ?? false);
    const compat = body.compat ?? {};
    const elements = Array.isArray(body.elements) ? body.elements : [];

    if (!elements.length) {
      return new Response("No elements provided", {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "text/plain; charset=utf-8",
        },
      });
    }

    // Optional: compute server-side stats to cross-check with frontend
    let vertexCount = 0;
    let triangleCount = 0;
    const countsByType = {};

    for (const el of elements) {
      if (Array.isArray(el.worldPositions)) {
        vertexCount += el.worldPositions.length / 3;
      }
      if (Array.isArray(el.indices)) {
        triangleCount += el.indices.length / 3;
      }
      const t = el.ifcType || "UNKNOWN";
      countsByType[t] = (countsByType[t] || 0) + 1;
    }

    const serverStats = {
      elementCount: elements.length,
      vertexCount,
      triangleCount,
      countsByType,
    };

    console.log("[IFC-DXF] Server stats:", serverStats);

    // 1) IFC STEP text (same elements)
    const ifcText = buildIFCWithOpts(projectName, elements, {
      schema,
      format,
      bakeWorld,
      compat,
    });

    // 2) DXF text (3D 3DFACE) from the same elements metadata
    const dxfText = buildDXFFromElements(elements, {
      dxfVersion: "AC1009",
      scale: 1000, // metres -> mm
      insunits: 4, // mm
    });

    const payload = {
      projectName,
      schema,
      format,
      exportFormat,
      stats: serverStats,
      ifc: ifcText,
      dxf: dxfText,
    };

    if (exportFormat === "dwg") {
      try {
        payload.dwg = await convertDxfToDwg({
          dxfText,
          fileName: fileName || `${projectName}.dxf`,
        });
      } catch (conversionError) {
        const message =
          conversionError instanceof Error
            ? conversionError.message
            : String(conversionError);
        console.error("[IFC-DXF] CloudConvert DWG error:", conversionError);
        return new Response(`DWG export failed: ${message}`, {
          status: 500,
          headers: {
            ...corsHeaders,
            "Content-Type": "text/plain; charset=utf-8",
          },
        });
      }
    }

    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[IFC+DXF] API error:", err);
    return new Response(`IFC+DXF export failed: ${message}`, {
      status: 500,
      headers: {
        ...corsHeaders,
        "Content-Type": "text/plain; charset=utf-8",
      },
    });
  }
}





export async function OPTIONS(request) {
  return handleCorsPreflight(request);
}