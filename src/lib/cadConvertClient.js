// /src/lib/cadConvertClient.js
const BASE_URL = (process.env.NEXT_PUBLIC_CONVERT_BASE_URL || 'http://192.168.30.92:9004').replace(/\/+$/, '');

export async function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onerror = () => reject(new Error('Failed to read file'));
    r.onload = () => {
      const s = String(r.result || '');
      resolve(s.includes(',') ? s.split(',')[1] : s);
    };
    r.readAsDataURL(file);
  });
}

export function extOf(name) { return (name?.split('.').pop() || '').toLowerCase(); }

export function buildFileUrl(requestId, name) {
  const base = `${BASE_URL}/convert/file/${encodeURIComponent(requestId)}`;
  return name ? `${base}?name=${encodeURIComponent(name)}` : base;
}

export async function fetchArtifactBlobUrl(requestId, name) {
  const url = buildFileUrl(requestId, name);
  const r = await fetch(url);
  if (!r.ok) throw new Error(`GET ${url} -> ${r.status}`);
  const blob = await r.blob();
  return URL.createObjectURL(blob);
}

export async function convertAny(payload) {
  const r = await fetch(`${BASE_URL}/convert/any`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok || !data?.ok) throw new Error(data?.message || `HTTP ${r.status}`);
  return data;
}

export async function convertFromFile(file, opts = {}) {
  const base64 = await readFileAsBase64(file);
  const inputFormat = opts.inputFormat || extOf(file.name) || 'bin';

  const payload = {
    file: base64,
    filename: file.name,
    inputFormat,
    outputFormat: opts.outputFormat || 'svg',
    inline: true,
    extractGeometry: opts.extractGeometry !== false,
    assumePlan2D: opts.assumePlan2D !== false,
    thickness: opts.thickness ?? 0.2,
    yLevel: opts.yLevel ?? 0.1,
    elevation: opts.elevation ?? 3,
    meta: { source: 'r3f' },
  };

  const resp = await convertAny(payload);

  let svgUrl = null;
  if (resp.inline?.mime?.includes('svg') && resp.inline.fileText) {
    svgUrl = URL.createObjectURL(new Blob([resp.inline.fileText], { type: 'image/svg+xml' }));
  } else {
    const art = (resp.artifacts || []).find(a => String(a.name || '').toLowerCase().endsWith('.svg'));
    if (art) svgUrl = await fetchArtifactBlobUrl(resp.requestId, art.name);
  }

  return { svgUrl, geometry: resp.geometry || null, requestId: resp.requestId, artifacts: resp.artifacts || [] };
}
