// src/cloudflare/api/image.service.js
import { http } from './http';

export async function createUploadIntentsWithConfig(payload) {
  // Creating intents can be slow for large batches because the server may call Cloudflare many times.
  const res = await http.post('/api/cloudflare/upload-intent', payload, {
    timeout: 10 * 60_000, // 10 minutes
  });
  return res.data;
}

export class CfDirectUploadError extends Error {
  constructor(message, { status, code, body } = {}) {
    super(message);
    this.name = 'CfDirectUploadError';
    this.status = status;
    this.code = code;
    this.body = body;
  }
}

function parseJsonSafe(text) {
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return null;
  }
}



export async function uploadDirectToCloudflare({ uploadURL, file }) {
  if (!uploadURL) throw new Error('Missing uploadURL');
  if (!file) throw new Error('Missing file');

  const form = new FormData();
  form.append('file', file, file?.name || 'upload');

  const res = await fetch(uploadURL, { method: 'POST', body: form });

  const text = await res.text();
  const json = parseJsonSafe(text);

  const code = json?.errors?.[0]?.code || json?.messages?.[0]?.code || null;

  if (!res.ok || json?.success === false) {
    const msg =
      json?.errors?.[0]?.message ||
      json?.messages?.[0]?.message ||
      `Upload failed (${res.status})`;

    throw new CfDirectUploadError(msg, {
      status: res.status,
      code,
      body: json || text,
    });
  }

  return json;
}

// ✅ NEW
export async function commitUploadMetadataToDb(payload) {
  const res = await http.post('/api/cloudflare/commit-upload', payload, {
    timeout: 2 * 60_000, // DB can be slow during big uploads
  });
  return res.data;
}
