// src/cloudflare/utils/files.js
import { inferResolutionCategory } from './format';
import { getExtension, IMAGE_EXT_RE } from './mime';

/**
 * Recursively walk DataTransfer for folders (webkit entries).
 */
export async function getFilesFromDataTransfer(dataTransfer) {
  const items = dataTransfer.items;
  const supportsEntries =
    items && items.length > 0 && typeof items[0].webkitGetAsEntry === 'function';

  if (!supportsEntries) return Array.from(dataTransfer.files || []);

  const traverseEntry = (entry, path) =>
    new Promise((resolve) => {
      if (entry.isFile) {
        entry.file((file) => {
          const relativePath = path + entry.name;
          file.relativePath = relativePath;
          resolve([file]);
        });
      } else if (entry.isDirectory) {
        const reader = entry.createReader();
        const entries = [];
        const readAll = () => {
          reader.readEntries((batch) => {
            if (!batch.length) {
              Promise.all(entries.map((ent) => traverseEntry(ent, path + entry.name + '/')))
                .then((arrays) => resolve(arrays.flat()));
            } else {
              entries.push(...batch);
              readAll();
            }
          });
        };
        readAll();
      } else {
        resolve([]);
      }
    });

  const tasks = [];
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    if (it.kind !== 'file') continue;
    const entry = it.webkitGetAsEntry();
    if (entry) tasks.push(traverseEntry(entry, ''));
  }
  const results = await Promise.all(tasks);
  return results.flat();
}

/**
 * Build the UI catalog from FileList / File[].
 *
 * Goal:
 * - Keep hierarchy when folder paths exist (Folder/Sub/file.png)
 * - BUT if user drops a single file (no folder), DO NOT create file/file
 */
export function catalogFiles(filesArray = []) {
  const out = [];

  for (let i = 0; i < filesArray.length; i++) {
    const file = filesArray[i];

    const fileName = file.name;
    const sizeBytes = file.size;
    const mimeType = file.type || 'application/octet-stream';
    const extension = getExtension(fileName);

    if (!IMAGE_EXT_RE.test(fileName)) continue;

    // Normalize any possible path source
    const fullRelativePathRaw =
      file.webkitRelativePath || file.relativePath || file.name;

    const fullRelativePath = String(fullRelativePathRaw || '')
      .replace(/^\/+/, '')
      .replace(/\/{2,}/g, '/')
      .trim();

    const segments = fullRelativePath.split('/').filter(Boolean);

    let rootSlug = '';
    let relativePath = '';
    let id = '';

    if (segments.length <= 1) {
      // ✅ single file => treat as true root file (NO fake folder)
      // This prevents "prod10.webp/prod10.webp" when backend joins rootSlug + fileName.
      rootSlug = '';
      relativePath = fileName;
      id = fileName;
    } else {
      // ✅ folder hierarchy exists => keep it
      rootSlug = segments[0];
      relativePath = segments.slice(1).join('/') || fileName;
      id = `${rootSlug}/${relativePath}`;
    }

    out.push({
      id, // ✅ final path-like id used for Cloudflare custom id
      file,
      rootSlug,
      relativePath,
      fileName,
      sizeBytes,
      mimeType,
      width: 0,
      height: 0,
      extension,
      resolutionCategory: inferResolutionCategory(sizeBytes),
    });
  }

  return out;
}
