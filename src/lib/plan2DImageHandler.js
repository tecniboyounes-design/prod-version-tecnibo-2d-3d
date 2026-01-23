// lib/plan2DImageHandler.js  (or wherever you keep these helpers)
import axios from "axios";
import fs from "fs";
import path from "path";
import { supabase } from "@/app/api/filesController/route";

/** Resolve storage root (fallback to ./storage to preserve current behavior) */
function getStorageRoot() {
  // absolute path hard-coded
  return "/home/yattaoui/tecnibo-storage";
}


function ensureDirSync(dir) {
  try {
    fs.mkdirSync(dir, { recursive: true });
  } catch (err) {
    // mkdirSync recursive is safe — ignore if dir exists, rethrow otherwise
    if (err && err.code !== 'EEXIST') throw err;
  }
}


/**
 * Save a PDF to: <STORAGE_ROOT>/plan2d/<versionId>/<versionId>-<timestamp>.pdf
 */


export async function savePdfLocally(base64Pdf, versionId, timestamp) {
  const storageDir = path.join(getStorageRoot(), "plan2d");
  const versionDir = path.join(storageDir, versionId);
  ensureDirSync(versionDir);
  const filename = `${versionId}-${timestamp}.pdf`;
  const filePath = path.join(versionDir, filename);
  fs.writeFileSync(filePath, base64Pdf, "base64");
  return filePath;
}

/**
 * Save a DWG to: <STORAGE_ROOT>/plan2d/<versionId>/<versionId>-<timestamp>.dwg
 */

export async function saveDwgLocally(base64Dwg, versionId, timestamp) {
  const storageDir = path.join(getStorageRoot(), "plan2d");
  const versionDir = path.join(storageDir, versionId);
  ensureDirSync(versionDir);
  const filename = `${versionId}-${timestamp}.dwg`;
  const filePath = path.join(versionDir, filename);
  fs.writeFileSync(filePath, base64Dwg, "base64");
  return filePath;
}

/**
 * Converts a base64-PDF to PNG via microservice, saving files under STORAGE_PATH (same behavior).
 */
export async function convertPdfViaMicroservice(base64Pdf, versionId, timestamp) {
  const pdfPath = await savePdfLocally(base64Pdf, versionId, timestamp);
  const { data, status } = await axios.post(
    "http://192.168.30.92:9000/convertPdfToImg",
    { base64Pdf },
    {
      headers: { "Content-Type": "application/json" },
      responseType: "json",
      timeout: 30_000,
    }
  );
  if (status !== 200 || !data.base64Png) {
    throw new Error(`Microservice conversion failed: status=${status}. payload=${JSON.stringify(data)}`);
  }
  return await savePlan2DImage(data.base64Png, versionId, timestamp);
}

/**
 * Convert DWG via microservice (keeps same behavior). Stores DWG using STORAGE_PATH first.
 */


export async function convertDwgViaMicroservice(base64Dwg, versionId, timestamp) {
  try {
    await saveDwgLocally(base64Dwg, versionId, timestamp);
    const { data, status } = await axios.post(
      "http://192.168.30.92:9001/process-dwg",
      { file: base64Dwg },
      {
        headers: { "Content-Type": "application/json" },
        responseType: "json",
        timeout: 50_000,
      }
    );
    if (status !== 200 || !data.plan2DImage) {
      throw new Error(`Microservice conversion failed: status=${status}. payload=${JSON.stringify(data)}`);
    }
    const { plan2DImage } = data;

    const { accessUrl } = await savePlan2DImage(plan2DImage, versionId, timestamp);
    const { error } = await supabase
      .from("versions")
      .update({ plan2DImage: accessUrl })
      .eq("id", versionId);
    if (error) throw error;
    return { accessUrl };
  } catch (error) {
    console.error("Error in convertDwgViaMicroservice:", error);
    throw error;
  }
}

/**
 * Save an image (data-url or raw base64) to STORAGE_ROOT/plan2d/<versionId>/...
 * Returns { filePath, accessUrl } (same accessUrl format you already use).
 */
export async function savePlan2DImage(base64Image, versionId, timestamp) {
  let imageData, extension;
  const match = base64Image.match(/^data:image\/(\w+);base64,(.+)$/);
  if (match) {
    extension = match[1].toLowerCase() === "jpeg" ? "jpg" : match[1].toLowerCase();
    imageData = match[2];
  } else {
    extension = "png";
    imageData = base64Image;
  }

  const storageDir = path.join(getStorageRoot(), "plan2d");
  const versionDir = path.join(storageDir, versionId);
  ensureDirSync(versionDir);

  const filename = `${versionId}-${timestamp}.${extension}`;
  const filePath = path.join(versionDir, filename);
  fs.writeFileSync(filePath, imageData, "base64");

  const accessUrl = `https://backend.tecnibo.com/api/plan2dimage?versionId=${versionId}&file=${encodeURIComponent(filename)}`;

  const { error } = await supabase
    .from("versions")
    .update({ plan2DImage: accessUrl })
    .eq("id", versionId);
  if (error) throw error;

  return { filePath, accessUrl };
}
