'use server';

import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { savePdfLocally, saveDwgLocally } from './plan2DImageHandler';
import { supabase } from '@/app/api/filesController/route';

const CLOUDCONVERT_API_KEY = process.env.CLOUDCONVERT_API_KEY;
const CLOUDCONVERT_USE_SANDBOX =
  String(process.env.CLOUDCONVERT_USE_SANDBOX || 'false').toLowerCase() === 'true';
const CLOUDCONVERT_BASE_URL = CLOUDCONVERT_USE_SANDBOX
  ? 'https://api-sandbox.cloudconvert.com/v2'
  : 'https://api.cloudconvert.com/v2';



function getStorageRoot() {
  return '/home/yattaoui/tecnibo-storage';
}

function ensureDirSync(dir) {
  try {
    fs.mkdirSync(dir, { recursive: true });
  } catch (err) {
    if (err && err.code !== 'EEXIST') throw err;
  }
}

function assertCloudConvertKey() {
  if (!CLOUDCONVERT_API_KEY) {
    throw new Error('CLOUDCONVERT_API_KEY is not configured');
  }
}

function parseBase64Image(base64Image, extHint) {
  let imageData = base64Image;
  let extension = extHint ? extHint.toLowerCase() : 'png';

  const dataUrlMatch = base64Image.match(/^data:image\/([^;]+);base64,(.+)$/i);
  if (dataUrlMatch) {
    const mimeExt = dataUrlMatch[1].toLowerCase();
    if (mimeExt === 'jpeg') extension = 'jpg';
    else if (mimeExt === 'svg+xml') extension = 'svg';
    else if (mimeExt) extension = mimeExt;
    imageData = dataUrlMatch[2];
  } else {
    // handle non-image data URLs like application/pdf
    const dataPdfMatch = base64Image.match(/^data:application\/([^;]+);base64,(.+)$/i);
    if (dataPdfMatch) {
      const mimeExt = dataPdfMatch[1].toLowerCase();
      extension = mimeExt === 'pdf' ? 'pdf' : mimeExt || extension;
      imageData = dataPdfMatch[2];
    }
  }

  return { imageData, extension };
}

function extractBase64Payload(str) {
  if (!str) return '';
  const match = str.match(/base64,(.+)$/i);
  return match ? match[1] : str;
}

function ensurePayload(label, dataUrl) {
  if (!dataUrl || typeof dataUrl !== 'string' || dataUrl.length === 0) {
    throw new Error(`Missing ${label} payload from CloudConvert`);
  }
  return dataUrl;
}


export async function savePlan2DImage(base64Image, versionId, timestamp, extHint, updateDb = true) {
  const { imageData, extension } = parseBase64Image(base64Image, extHint);

  const storageDir = path.join(getStorageRoot(), 'plan2d');
  const versionDir = path.join(storageDir, versionId);
  ensureDirSync(versionDir);

  const filename = `${versionId}-${timestamp}.${extension}`;
  const filePath = path.join(versionDir, filename);
  fs.writeFileSync(filePath, imageData, 'base64');

  const accessUrl = `https://backend.tecnibo.com/api/plan2dimage?versionId=${versionId}&file=${encodeURIComponent(
    filename
  )}`;

  if (updateDb) {
    const { error } = await supabase
      .from('versions')
      .update({ plan2DImage: accessUrl })
      .eq('id', versionId);
    if (error) throw error;
  }

  return { filePath, accessUrl, filename };
}

// Save without touching Supabase (used for original source files like pdf)
function savePlan2DFileNoDb(base64Data, versionId, timestamp, ext) {
  const { imageData, extension } = parseBase64Image(base64Data, ext);

  const storageDir = path.join(getStorageRoot(), 'plan2d');
  const versionDir = path.join(storageDir, versionId);
  ensureDirSync(versionDir);

  const filename = `${versionId}-${timestamp}.${extension}`;
  const filePath = path.join(versionDir, filename);
  fs.writeFileSync(filePath, imageData, 'base64');

  const accessUrl = `https://backend.tecnibo.com/api/plan2dimage?versionId=${versionId}&file=${encodeURIComponent(
    filename
  )}`;

  return { filePath, accessUrl, filename };
}



const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function runCloudConvertToFormat({ base64File, inputFilename, outputFormat = 'png' }) {
  assertCloudConvertKey();

  const jobRes = await axios.post(
    `${CLOUDCONVERT_BASE_URL}/jobs`,
    {
      tasks: {
        'import-file': {
          operation: 'import/base64',
          file: base64File,
          filename: inputFilename,
        },
        'convert-file': {
          operation: 'convert',
          input: ['import-file'],
          output_format: outputFormat,
        },
        'export-file': {
          operation: 'export/url',
          input: ['convert-file'],
          inline: false,
          archive_multiple_files: false,
        },
      },
    },
    {
      headers: {
        Authorization: `Bearer ${CLOUDCONVERT_API_KEY}`,
        'Content-Type': 'application/json',
      },
    }
  );

  const jobId = jobRes?.data?.data?.id;
  if (!jobId) {
    throw new Error('CloudConvert job creation failed');
  }

  let exportFile = null;
  for (let i = 0; i < 10; i++) {
    const statusRes = await axios.get(`${CLOUDCONVERT_BASE_URL}/jobs/${jobId}`, {
      headers: { Authorization: `Bearer ${CLOUDCONVERT_API_KEY}` },
    });

    const tasks = statusRes?.data?.data?.tasks || [];
    const failedTask = tasks.find((t) => t?.status === 'error' || t?.status === 'failed');
    if (failedTask) {
      const message =
        failedTask?.result?.message ||
        failedTask?.message ||
        'CloudConvert conversion failed';
      throw new Error(message);
    }

    const exportTask = tasks.find((t) => t?.operation === 'export/url');
    const file = exportTask?.result?.files?.[0];
    if (file?.url) {
      exportFile = file;
      break;
    }

    await delay(1500);
  }

  if (!exportFile?.url) {
    throw new Error('CloudConvert export URL not ready');
  }

  const download = await axios.get(exportFile.url, { responseType: 'arraybuffer' });
  const base64Image = Buffer.from(download.data).toString('base64');

  return {
    base64Image: `data:image/${outputFormat};base64,${base64Image}`,
    outputFilename: exportFile.filename || inputFilename.replace(/\.[^.]+$/, `.${outputFormat}`),
  };
}

export async function convertPdfViaCloudConvert(base64Pdf, versionId, timestamp) {
  const inputName = `${versionId}-${timestamp}.pdf`;
  const pdfResult = savePlan2DFileNoDb(base64Pdf, versionId, timestamp, 'pdf');

  const { base64Image: svgDataUrl } = await runCloudConvertToFormat({
    base64File: base64Pdf,
    inputFilename: inputName,
    outputFormat: 'svg',
  });

  const [{ base64Image: pngDataUrl }, { base64Image: pdfOutDataUrl }] = await Promise.all([
    runCloudConvertToFormat({
      base64File: extractBase64Payload(svgDataUrl),
      inputFilename: inputName.replace(/\.pdf$/i, '.svg'),
      outputFormat: 'png',
    }),
    runCloudConvertToFormat({
      base64File: base64Pdf,
      inputFilename: inputName,
      outputFormat: 'pdf',
    }),
  ]);

  const pngResult = await savePlan2DImage(
    ensurePayload('png', pngDataUrl),
    versionId,
    timestamp,
    'png',
    true
  );
  const svgResult = await savePlan2DImage(
    ensurePayload('svg', svgDataUrl),
    versionId,
    timestamp,
    'svg',
    false
  );
  const pdfConvResult = savePlan2DFileNoDb(
    ensurePayload('pdf', pdfOutDataUrl),
    versionId,
    timestamp,
    'pdf'
  );

  console.warn('[convertPdfViaCloudConvert] saved assets', {
    versionId,
    timestamp,
    pdfSource: pdfResult.filename,
    pdfConverted: pdfConvResult.filename,
    png: pngResult.filename,
    svg: svgResult.filename,
  });

  return { pdf: pdfConvResult, png: pngResult, svg: svgResult };
}

export async function convertDwgViaCloudConvert(base64Dwg, versionId, timestamp) {
  const inputName = `${versionId}-${timestamp}.dwg`;
  await saveDwgLocally(base64Dwg, versionId, timestamp);

  const { base64Image: svgDataUrl } = await runCloudConvertToFormat({
    base64File: base64Dwg,
    inputFilename: inputName,
    outputFormat: 'svg',
  });

  const [{ base64Image: pngDataUrl }, { base64Image: pdfDataUrl }] = await Promise.all([
    runCloudConvertToFormat({
      base64File: extractBase64Payload(svgDataUrl),
      inputFilename: inputName.replace(/\.dwg$/i, '.svg'),
      outputFormat: 'png',
    }),
    runCloudConvertToFormat({
      base64File: base64Dwg,
      inputFilename: inputName,
      outputFormat: 'pdf',
    }),
  ]);

  const pngResult = await savePlan2DImage(
    ensurePayload('png', pngDataUrl),
    versionId,
    timestamp,
    'png',
    true
  );
  const svgResult = await savePlan2DImage(
    ensurePayload('svg', svgDataUrl),
    versionId,
    timestamp,
    'svg',
    false
  );
  
  const pdfResult = savePlan2DFileNoDb(
    ensurePayload('pdf', pdfDataUrl),
    versionId,
    timestamp,
    'pdf'
  );

  console.warn('[convertDwgViaCloudConvert] saved assets', {
    versionId,
    timestamp,
    pdf: pdfResult.filename,
    png: pngResult.filename,
    svg: svgResult.filename,
  });

  return { pdf: pdfResult, png: pngResult, svg: svgResult };
}

/**
 * Orchestrator: pick the right converter by type.
 * type: 'pdf' | 'dwg'
 */

export async function convertPlan2DViaCloudConvert({ type, base64, versionId, timestamp }) {
  if (type === 'pdf') {
    return convertPdfViaCloudConvert(base64, versionId, timestamp);
  }
  if (type === 'dwg') {
    return convertDwgViaCloudConvert(base64, versionId, timestamp);
  }
  throw new Error(`Unsupported type "${type}"`);
}
