import axios from "axios";
import fs from "fs";
import path from "path";
import { supabase } from "@/app/api/filesController/route";

/**
 * Saves a PDF with a timestamped filename:
 *   storage/plan2d/<versionId>/<versionId>-<timestamp>.pdf
 */
export async function savePdfLocally(base64Pdf, versionId, timestamp) {
  const storageDir = path.join(process.cwd(), "storage", "plan2d");
  const versionDir = path.join(storageDir, versionId);
  if (!fs.existsSync(storageDir)) fs.mkdirSync(storageDir, { recursive: true });
  if (!fs.existsSync(versionDir)) fs.mkdirSync(versionDir, { recursive: true });
  const filename = `${versionId}-${timestamp}.pdf`;
  const filePath = path.join(versionDir, filename);
  fs.writeFileSync(filePath, base64Pdf, "base64");
  return filePath;
}

/**
 * Saves a DWG with a timestamped filename:
 *   storage/plan2d/<versionId>/<versionId>-<timestamp>.dwg
 */
export async function saveDwgLocally(base64Dwg, versionId, timestamp) {
  const storageDir = path.join(process.cwd(), "storage", "plan2d");
  const versionDir = path.join(storageDir, versionId);
  if (!fs.existsSync(storageDir)) fs.mkdirSync(storageDir, { recursive: true });
  if (!fs.existsSync(versionDir)) fs.mkdirSync(versionDir, { recursive: true });
  const filename = `${versionId}-${timestamp}.dwg`;
  const filePath = path.join(versionDir, filename);
  fs.writeFileSync(filePath, base64Dwg, "base64");
  return filePath;
}

/**
 * Converts a base64-PDF to PNG with a shared timestamp.
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
 * Converts a base64-DWG to PNG, saving the DWG locally first.
 */
export async function convertDwgViaMicroservice(base64Dwg, versionId, timestamp) {
  try {
    // Save DWG locally with the same timestamp
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
    const { plan2DImage, points, lines } = data;
    
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
 * Saves an image (e.g., PNG) with a timestamped filename:
 *   storage/plan2d/<versionId>/<versionId>-<timestamp>.<extension>
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
  const storageDir = path.join(process.cwd(), "storage", "plan2d");
  const versionDir = path.join(storageDir, versionId);
  if (!fs.existsSync(storageDir)) fs.mkdirSync(storageDir, { recursive: true });
  if (!fs.existsSync(versionDir)) fs.mkdirSync(versionDir, { recursive: true });
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

