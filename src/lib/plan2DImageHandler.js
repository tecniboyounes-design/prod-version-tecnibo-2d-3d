// lib/plan2DImageHandler.js

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

  if (!fs.existsSync(storageDir)) {
    fs.mkdirSync(storageDir, { recursive: true });
  }
  if (!fs.existsSync(versionDir)) {
    fs.mkdirSync(versionDir, { recursive: true });
  }

  const filename = `${versionId}-${timestamp}.pdf`;
  const filePath = path.join(versionDir, filename);
  fs.writeFileSync(filePath, base64Pdf, "base64");
  return filePath;
}

/**
 * Converts a base64‐PDF to PNG, but now we pass in `timestamp`.
 *   1. savePdfLocally(…, timestamp)
 *   2. POST to microservice
 *   3. savePlan2DImage(…, timestamp)
 */
export async function convertPdfViaMicroservice(
  base64Pdf,
  versionId,
  timestamp
) {
  // 1) Save the PDF with the shared timestamp
  const pdfPath = await savePdfLocally(base64Pdf, versionId, timestamp);

  // 2) Send that PDF (or base64Pdf) to microservice:
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
    throw new Error(
      `Microservice conversion failed: status=${status}. payload= ${JSON.stringify(
        data
      )}`
    );
  }

  // 3) Save the PNG using the same timestamp:
  return await savePlan2DImage(data.base64Png, versionId, timestamp);
}

/**
 * Saves a PNG (base64) with the same timestamped filename:
 *   storage/plan2d/<versionId>/<versionId>-<timestamp>.png
 * and updates Supabase → versions.plan2DImage.
 */
export async function savePlan2DImage(base64Image, versionId, timestamp) {
  // extract extension + base64 payload
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
  if (!fs.existsSync(storageDir)) {
    fs.mkdirSync(storageDir, { recursive: true });
  }
  if (!fs.existsSync(versionDir)) {
    fs.mkdirSync(versionDir, { recursive: true });
  }

  const filename = `${versionId}-${timestamp}.${extension}`;
  const filePath = path.join(versionDir, filename);
  fs.writeFileSync(filePath, imageData, "base64");

  // Now build a URL pointing to exactly that `<versionId>-<timestamp>.<ext>`
  const accessUrl =
    `http://192.168.30.92:3000/api/plan2dimage`
    + `?versionId=${versionId}`
    + `&file=${encodeURIComponent(filename)}`;

  const { error } = await supabase
    .from("versions")
    .update({ plan2DImage: accessUrl })
    .eq("id", versionId);
  if (error) throw error;

  return { filePath, accessUrl };
}
