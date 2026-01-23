// src/cloudflare/utils/explorerContextMenu.js

export const MENU_ACTION = Object.freeze({
  // Common
  REFRESH: 'REFRESH',
  PROPERTIES: 'PROPERTIES',

  // Open / preview
  OPEN: 'OPEN',
  OPEN_NEW_TAB: 'OPEN_NEW_TAB',
  PREVIEW: 'PREVIEW',
  PREVIEW_NEW_TAB: 'PREVIEW_NEW_TAB',

  // Copy
  COPY_PATH: 'COPY_PATH',
  COPY_NAME: 'COPY_NAME',
  COPY_ID: 'COPY_ID',
  COPY_JSON: 'COPY_JSON',
  COPY_URL: 'COPY_URL',

  // Manage
  RENAME: 'RENAME',

  // ✅ unified delete:
  // - folder => DB-only delete
  // - file   => Cloudflare + DB delete
  DELETE: 'DELETE',

  DELETE_UI_ONLY: 'DELETE_UI_ONLY',
  REMOVE_PENDING: 'REMOVE_PENDING',
  GO_TO_UPLOAD_TABLE: 'GO_TO_UPLOAD_TABLE',
  DUPLICATE_UPLOAD: 'DUPLICATE_UPLOAD',

  // ✅ NEW (UI + data fetch in UploadConfigurator)
  SHOW_IN_TABLE: 'SHOW_IN_TABLE',

  // Create / paste
  NEW_FOLDER: 'NEW_FOLDER',
  UPLOAD_FILES: 'UPLOAD_FILES',
  UPLOAD_FOLDER: 'UPLOAD_FOLDER',
  PASTE: 'PASTE',

  // View / sort
  VIEW_LARGE: 'VIEW_LARGE',
  VIEW_MEDIUM: 'VIEW_MEDIUM',
  VIEW_SMALL: 'VIEW_SMALL',
  SORT_NAME: 'SORT_NAME',
  SORT_TYPE: 'SORT_TYPE',
  SORT_SIZE: 'SORT_SIZE',
  SORT_DATE: 'SORT_DATE',
});

/**
 * @typedef {Object} ExplorerMenuItem
 * @property {string} key
 * @property {string=} label
 * @property {string=} action  // MENU_ACTION
 * @property {any=} payload     // optional data for action handler
 * @property {boolean=} disabled
 * @property {boolean=} danger
 * @property {string=} hint
 * @property {string=} shortcut
 * @property {string=} iconKey  // you can map iconKey -> MUI Icon in the component
 * @property {boolean=} divider
 * @property {ExplorerMenuItem[]=} children
 */

/**
 * Detect context from your item shape.
 * Works with:
 * - server items: { path, type: 'folder'|'file', name, isPending? }
 * - pending injected items: { path, type:'file', isPending:true, ... }
 */
export function getExplorerContext(item) {
  const isBackground = !item;
  if (isBackground) {
    return {
      kind: 'background', // background | folder | file
      isPending: false,
      isPdf: false,
      isImage: false,
      name: '',
      path: '',
      id: null,
      item: null,
    };
  }

  const type = String(item.type || '').toLowerCase();
  const isFolder = type === 'folder' || type === 'folder_open' || type === 'root';
  const isFile = type === 'file';

  const name = String(item.name || '').trim();
  const path = String(item.path || '').trim();
  const id = item.id ?? null;

  const lower = name.toLowerCase();
  const isPdf = isFile && lower.endsWith('.pdf');
  // treat non-pdf file as image for now (you can refine later)
  const isImage = isFile && !isPdf;

  return {
    kind: isFolder ? 'folder' : isFile ? 'file' : 'unknown',
    isPending: Boolean(item.isPending),
    isPdf,
    isImage,
    name,
    path,
    id,
    item,
  };
}

/**
 * Safe clipboard helper (works in most browsers; fallback included).
 */
export async function copyToClipboard(text) {
  const value = String(text ?? '');
  if (!value) return false;

  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      // Try the modern API first
      if (navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(value);
        return true;
      }
      // Fallback to ClipboardItem API if available (some browsers)
      if (navigator.clipboard.write && typeof ClipboardItem !== 'undefined') {
        const item = new ClipboardItem({ 'text/plain': new Blob([value], { type: 'text/plain' }) });
        await navigator.clipboard.write([item]);
        return true;
      }
    }
  } catch {
    // fallback below
  }

  try {
    // Fallback: hidden textarea
    if (typeof document === 'undefined') return false;
    const ta = document.createElement('textarea');
    ta.value = value;
    ta.style.position = 'fixed';
    ta.style.top = '-9999px';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return Boolean(ok);
  } catch {
    return false;
  }
}

/**
 * Main builder: returns a menu model (with dividers + submenus).
 *
 * @param {Object} args
 * @param {any=} args.item
 * @param {string=} args.currentPath
 * @returns {ExplorerMenuItem[]}
 */
export function buildExplorerContextMenuModel({ item, currentPath = '' } = {}) {
  const ctx = getExplorerContext(item);
  const nameForCopy = ctx.name || (ctx.path ? ctx.path.split('/').filter(Boolean).pop() : '');

  // Helpers to avoid repeating boilerplate
  const div = (key) => ({ key, divider: true });
  const mi = ({
    key,
    label,
    action,
    payload,
    disabled = false,
    danger = false,
    hint,
    shortcut,
    iconKey,
    children,
  }) => ({
    key,
    label,
    action,
    payload,
    disabled,
    danger,
    hint,
    shortcut,
    iconKey,
    children,
  });

  // --- Background menu (empty area) ---
  if (ctx.kind === 'background') {
    return [
      mi({
        key: 'bg-show-table',
        label: 'Show in table',
        action: MENU_ACTION.SHOW_IN_TABLE,
        payload: { path: currentPath || '', kind: 'background' },
        disabled: false,
        hint: 'Loads from server',
        iconKey: 'table',
      }),
      div('bg-div-0'),

      mi({
        key: 'bg-new-folder',
        label: 'New Folder',
        action: MENU_ACTION.NEW_FOLDER,
        disabled: false,
        hint: 'Creates DB-only folder',
        iconKey: 'folder-plus',
      }),
      mi({
        key: 'bg-upload-files',
        label: 'Upload Files…',
        action: MENU_ACTION.UPLOAD_FILES,
        disabled: false,
        hint: 'Pick images from device',
        iconKey: 'upload',
      }),
      mi({
        key: 'bg-upload-folder',
        label: 'Upload Folder…',
        action: MENU_ACTION.UPLOAD_FOLDER,
        disabled: false,
        hint: 'Pick a directory of images',
        iconKey: 'upload-folder',
      }),
      mi({
        key: 'bg-paste',
        label: 'Paste',
        action: MENU_ACTION.PASTE,
        disabled: true,
        hint: 'Soon',
        iconKey: 'paste',
      }),
      div('bg-div-1'),

      mi({
        key: 'bg-refresh',
        label: 'Refresh',
        action: MENU_ACTION.REFRESH,
        disabled: false,
        iconKey: 'refresh',
        shortcut: 'F5',
      }),
      div('bg-div-2'),

      mi({
        key: 'bg-view',
        label: 'View',
        iconKey: 'view',
        children: [
          mi({ key: 'bg-view-large', label: 'Large icons', action: MENU_ACTION.VIEW_LARGE, disabled: true }),
          mi({ key: 'bg-view-medium', label: 'Medium icons', action: MENU_ACTION.VIEW_MEDIUM, disabled: true }),
          mi({ key: 'bg-view-small', label: 'Small icons', action: MENU_ACTION.VIEW_SMALL, disabled: true }),
        ],
      }),
      mi({
        key: 'bg-sort',
        label: 'Sort by',
        iconKey: 'sort',
        children: [
          mi({ key: 'bg-sort-name', label: 'Name', action: MENU_ACTION.SORT_NAME, disabled: false }),
          mi({ key: 'bg-sort-type', label: 'Type', action: MENU_ACTION.SORT_TYPE, disabled: false }),
          mi({ key: 'bg-sort-size', label: 'Size', action: MENU_ACTION.SORT_SIZE, disabled: false }),
          mi({ key: 'bg-sort-date', label: 'Date', action: MENU_ACTION.SORT_DATE, disabled: false }),
        ],
      }),
      div('bg-div-3'),

      mi({
        key: 'bg-properties',
        label: 'Properties',
        action: MENU_ACTION.PROPERTIES,
        disabled: true,
        hint: 'Soon',
        iconKey: 'info',
      }),
    ];
  }

  // --- Folder menu ---
  if (ctx.kind === 'folder') {
    const openDisabled = ctx.isPending; // pending folders should not navigate (your rule)

    return [
      mi({
        key: 'folder-open',
        label: 'Open',
        action: MENU_ACTION.OPEN,
        payload: { path: ctx.path, type: 'folder' },
        disabled: openDisabled,
        hint: openDisabled ? 'Upload first' : undefined,
        iconKey: 'open',
      }),
      mi({
        key: 'folder-show-table',
        label: 'Show in table',
        action: MENU_ACTION.SHOW_IN_TABLE,
        payload: { path: ctx.path, kind: 'folder' },
        disabled: false,
        hint: 'Loads from server',
        iconKey: 'table',
      }),
      mi({
        key: 'folder-duplicate-upload',
        label: 'Upload copy here',
        action: MENU_ACTION.DUPLICATE_UPLOAD,
        payload: { path: ctx.path },
        disabled: false,
        hint: 'Create "(copy)" folder and upload there',
        iconKey: 'upload',
      }),
      div('folder-div-1'),

      mi({
        key: 'folder-copy-path',
        label: 'Copy path',
        action: MENU_ACTION.COPY_PATH,
        payload: { text: ctx.path || currentPath || '' },
        disabled: !(ctx.path || currentPath),
        iconKey: 'copy',
      }),
      mi({
        key: 'folder-copy-name',
        label: 'Copy name',
        action: MENU_ACTION.COPY_NAME,
        payload: { text: nameForCopy || ctx.name },
        disabled: !nameForCopy,
        iconKey: 'copy',
      }),
      mi({
        key: 'folder-copy-json',
        label: 'Copy JSON',
        action: MENU_ACTION.COPY_JSON,
        payload: { json: ctx.item },
        disabled: false,
        iconKey: 'code',
      }),
      div('folder-div-2'),

      mi({
        key: 'folder-new-folder',
        label: 'New Folder here',
        action: MENU_ACTION.NEW_FOLDER,
        payload: { path: ctx.path },
        disabled: !ctx.path,
        hint: 'Creates subfolder (DB only)',
        iconKey: 'folder-plus',
      }),

      mi({
        key: 'folder-rename',
        label: 'Rename',
        action: MENU_ACTION.RENAME,
        payload: {
          path: ctx.path,
          type: 'folder',
          name: ctx.name,
          isPending: ctx.isPending,
          pendingOnly: ctx.item?.pendingOnly,
          hasServerChild: ctx.item?.hasServerChild,
        },
        disabled: ctx.isPending || !ctx.path || Boolean(ctx.item?.hasServerChild),
        hint: ctx.isPending
          ? 'Upload first'
          : !ctx.path
            ? 'Root cannot be renamed'
            : ctx.item?.hasServerChild
              ? 'Rename disabled after assets are uploaded'
              : undefined,
        shortcut: 'F2',
        iconKey: 'rename',
      }),

      // ✅ unified delete: folder => DB only
      mi({
        key: 'folder-delete',
        label: 'Delete (DB only)',
        action: MENU_ACTION.DELETE,
        payload: { type: 'folder', path: ctx.path, id: String(ctx.id ?? '') },
        disabled: ctx.isPending || !ctx.path,
        hint: ctx.isPending
          ? 'Upload first'
          : !ctx.path
            ? 'Root cannot be deleted'
            : 'Does not delete Cloudflare images',
        danger: true,
        iconKey: 'delete',
      }),

      div('folder-div-3'),
      mi({
        key: 'folder-properties',
        label: 'Properties',
        action: MENU_ACTION.PROPERTIES,
        disabled: true,
        hint: 'Soon',
        iconKey: 'info',
      }),
    ];
  }

  // --- File menu (image/pdf) ---
  if (ctx.kind === 'file') {
    const canPreview = ctx.isImage || ctx.isPdf;

    return [
      mi({
        key: 'file-preview',
        label: ctx.isPdf ? 'Open' : 'Preview',
        action: ctx.isPdf ? MENU_ACTION.OPEN : MENU_ACTION.PREVIEW,
        payload: { path: ctx.path, item: ctx.item, type: 'file' },
        disabled: !canPreview,
        hint: canPreview ? (ctx.isPdf ? undefined : 'Preview in modal') : 'Preview only for images/PDF',
        iconKey: 'preview',
      }),
      mi({
        key: 'file-preview-newtab',
        label: 'Open preview in new tab',
        action: MENU_ACTION.PREVIEW_NEW_TAB,
        payload: { path: ctx.path, item: ctx.item, type: 'file' },
        disabled: !canPreview,
        hint: canPreview ? 'Uses delivery URL' : 'Preview only for images/PDF',
        iconKey: 'open-tab',
      }),
      mi({
        key: 'file-show-table',
        label: 'Show in table',
        action: MENU_ACTION.SHOW_IN_TABLE,
        payload: { path: ctx.path, kind: 'file' },
        disabled: false,
        hint: 'Loads from server',
        iconKey: 'table',
      }),
      div('file-div-1'),

      mi({
        key: 'file-copy-path',
        label: 'Copy path',
        action: MENU_ACTION.COPY_PATH,
        payload: { text: ctx.path },
        disabled: !ctx.path,
        iconKey: 'copy',
      }),
      mi({
        key: 'file-copy-name',
        label: 'Copy name',
        action: MENU_ACTION.COPY_NAME,
        payload: { text: nameForCopy || ctx.name },
        disabled: !nameForCopy,
        iconKey: 'copy',
      }),
      mi({
        key: 'file-copy-id',
        label: 'Copy ID',
        action: MENU_ACTION.COPY_ID,
        payload: { text: String(ctx.id ?? '') },
        disabled: !ctx.id,
        hint: !ctx.id ? 'No id' : undefined,
        iconKey: 'fingerprint',
      }),
      mi({
        key: 'file-copy-url',
        label: 'Copy URL',
        action: MENU_ACTION.COPY_URL,
        disabled: ctx.isPending || !ctx.isImage,
        hint: ctx.isPending ? 'Only after upload' : (!ctx.isImage ? 'Images only' : 'Uses delivery base'),
        iconKey: 'link',
      }),
      mi({
        key: 'file-copy-json',
        label: 'Copy JSON',
        action: MENU_ACTION.COPY_JSON,
        payload: { json: ctx.item },
        disabled: false,
        iconKey: 'code',
      }),
      mi({
        key: 'file-rename',
        label: 'Rename',
        action: MENU_ACTION.RENAME,
        payload: {
          path: ctx.path,
          type: 'file',
          name: ctx.name,
          isPending: ctx.isPending,
          pendingOnly: ctx.item?.pendingOnly,
        },
        disabled: ctx.isPending || !ctx.path,
        hint: ctx.isPending ? 'Upload first' : !ctx.path ? 'Missing path' : undefined,
        shortcut: 'F2',
        iconKey: 'rename',
      }),
      div('file-div-2'),

      // ✅ unified delete: file => Cloudflare + DB
      mi({
        key: 'file-delete',
        label: 'Delete',
        action: MENU_ACTION.DELETE,
        payload: { type: 'file', id: String(ctx.id ?? ''), path: ctx.path },
        disabled: ctx.isPending,
        hint: ctx.isPending ? 'Only after upload' : 'Deletes from Cloudflare + DB',
        danger: true,
        iconKey: 'delete',
      }),

      div('file-div-3'),
      mi({
        key: 'file-properties',
        label: 'Properties',
        action: MENU_ACTION.PROPERTIES,
        disabled: true,
        hint: 'Soon',
        iconKey: 'info',
      }),
    ];
  }

  // Unknown fallback
  return [
    mi({
      key: 'unknown-copy-json',
      label: 'Copy JSON',
      action: MENU_ACTION.COPY_JSON,
      payload: { json: item },
      disabled: false,
      iconKey: 'code',
    }),
  ];
}

/**
 * Utility: convert JSON payload to a stable string for copying.
 */
export function stringifyForClipboard(obj) {
  try {
    return JSON.stringify(obj, null, 2);
  } catch {
    return String(obj);
  }
}
