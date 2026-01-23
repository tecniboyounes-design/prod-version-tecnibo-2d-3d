// src/cloudflare/utils/imageDimensions.js
import { catalogFiles } from './files';

// --- dimensions helper ---
async function getImageDimensions(file) {
  if (!file) return { width: 0, height: 0 };

  // Fast path (Chrome/Edge/modern browsers)
  if (typeof createImageBitmap === 'function') {
    try {
      const bmp = await createImageBitmap(file);
      const out = { width: bmp?.width || 0, height: bmp?.height || 0 };
      try { bmp.close?.(); } catch {}
      return out;
    } catch {
      // fallback below
    }
  }

  // Fallback: <img> + objectURL
  return await new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      const width = img.naturalWidth || img.width || 0;
      const height = img.naturalHeight || img.height || 0;
      URL.revokeObjectURL(url);
      resolve({ width, height });
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({ width: 0, height: 0 });
    };

    img.src = url;
  });
}

/**
 * ✅ same output as catalogFiles(), but fills width/height and logs.
 */
export async function catalogFilesWithDimensions(filesArray = []) {
  const items = catalogFiles(filesArray);

  await Promise.all(
    items.map(async (it) => {
      const { width, height } = await getImageDimensions(it.file);
      it.width = width;
      it.height = height;

      // console.log('[cf][dims]', it.id, {
      //   fileName: it.fileName,
      //   mimeType: it.mimeType,
      //   sizeBytes: it.sizeBytes,
      //   width,
      //   height,
      // });
    })
  );

  return items;
}
