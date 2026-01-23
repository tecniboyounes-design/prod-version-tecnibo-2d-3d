// src/cloudflare/utils/serverCatalog.js
import { normPath, basename, extFromName, guessMimeFromExt, inferResolutionCategory } from './pathMime';

// Convert server FS items ({id, path, type}) into “catalog-like items”
export function fsItemsToCatalogItems(fsItems) {
  const list = Array.isArray(fsItems) ? fsItems : [];
  return list
    .filter((it) => String(it?.type) === 'file')
    .map((it) => {
      const path = normPath(it?.path);
      const fileName = basename(path);
      const ext = extFromName(fileName);

      const parts = path.split('/').filter(Boolean);
      const rootSlug = parts.length > 1 ? parts[0] : '';
      const relativePath = parts.length > 1 ? parts.slice(1).join('/') : '';

      const hier = path || fileName || String(it?.id || '');

      const mimeType = String(it?.mimeType || '') || guessMimeFromExt(ext) || 'application/octet-stream';
      const sizeBytes = Number(it?.sizeBytes ?? 0) || 0;
      const width = Number(it?.width ?? 0) || 0;
      const height = Number(it?.height ?? 0) || 0;

      return {
        id: String(it?.id || path || fileName),
        rootSlug,
        relativePath,
        fileName,
        sizeBytes,
        mimeType,
        width,
        height,
        extension: ext || '',
        resolutionCategory: String(it?.resolutionCategory || '') || inferResolutionCategory(width, height),
        hier,
      };
    });
}



export function toMetaRows(items) {
  return (items || []).map((i) => {
    const rootSlug = String(i.rootSlug || '').trim();
    const relativePath = String(i.relativePath || '').trim();
    const fileName = String(i.fileName || '').trim();

    const computedHier =
      String(i.hier || '').trim() ||
      (rootSlug
        ? `${rootSlug}${relativePath ? '/' + relativePath : ''}`
        : relativePath || fileName || String(i.id || ''));

    return {
      id: i.id,
      rootSlug,
      relativePath,
      fileName,
      sizeBytes: Number(i.sizeBytes ?? 0),
      mimeType: i.mimeType,
      width: Number(i.width ?? 0),
      height: Number(i.height ?? 0),
      extension: i.extension,
      resolutionCategory: i.resolutionCategory,
      hier: computedHier,

      // Optional (server apply may merge these later)
      openUrl: i.openUrl || null,
      thumbUrl: i.thumbUrl || null,
    };
  });
}
