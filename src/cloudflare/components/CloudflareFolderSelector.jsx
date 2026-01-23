// src/cloudflare/components/CloudflareFolderSelector.jsx
'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Paper,
  Typography,
  Stack,
  Box,
  Skeleton,
  Divider,
  Breadcrumbs,
  Link,
  Fade,
  Badge,
  Chip,
  Alert,
  CircularProgress,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  TextField,
} from '@mui/material';

import Popper from '@mui/material/Popper';
import MenuList from '@mui/material/MenuList';

import FolderIcon from '@mui/icons-material/Folder';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import InsertPhotoIcon from '@mui/icons-material/InsertPhoto';
import DescriptionIcon from '@mui/icons-material/Description';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import IconButton from '@mui/material/IconButton';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import CloudQueueIcon from '@mui/icons-material/CloudQueue';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import AutoModeIcon from '@mui/icons-material/AutoMode';
import DnsIcon from '@mui/icons-material/Dns';
import StraightenIcon from '@mui/icons-material/Straighten';
import DataUsageIcon from '@mui/icons-material/DataUsage';

// Context menu icons
import DeleteIcon from '@mui/icons-material/Delete';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import RefreshIcon from '@mui/icons-material/Refresh';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import CodeIcon from '@mui/icons-material/Code';
import LinkIcon from '@mui/icons-material/Link';
import FingerprintIcon from '@mui/icons-material/Fingerprint';
import TableViewIcon from '@mui/icons-material/TableView';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import DriveFileRenameOutlineIcon from '@mui/icons-material/DriveFileRenameOutline';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import CreateNewFolderIcon from '@mui/icons-material/CreateNewFolder';
import ContentPasteIcon from '@mui/icons-material/ContentPaste';
import VisibilityIcon from '@mui/icons-material/Visibility';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import PreviewIcon from '@mui/icons-material/Preview';
import LaunchIcon from '@mui/icons-material/Launch';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ViewModuleIcon from '@mui/icons-material/ViewModule';
import SortIcon from '@mui/icons-material/Sort';

import { fetchCloudflareFs, syncCloudflareFs } from '../api/fs.service';
import {
  buildExplorerContextMenuModel,
  MENU_ACTION,
  copyToClipboard,
  stringifyForClipboard,
} from '../utils/explorerContextMenu';
import { buildDeliveryUrl } from '@/cloudflare/server/cfDelivery';
import { deleteCloudflareEntry } from '../api/delete.service';
import { deleteDbFolder, createDbFolder } from '../api/folders.service';
import { renameCloudflarePath } from '../api/rename.service';
import PreviewDialog from './upload-configurator/dialogs/PreviewDialog';
import { useRubberBandSelection } from '../rubberBanding/useRubberBandSelection';
import ConfirmDialog from './ConfirmDialog';

const SORT_STORAGE_KEY = 'CF_EXPLORER_SORT';
const SORT_DEFAULT = { key: 'name', dir: 'asc' };


// ✅ FIX: set a REAL fixed height so the middle grid area can scroll
const EXPLORER_HEIGHT_PX = 650;

// Helper: Format Bytes
const formatBytes = (bytes, decimals = 2) => {
  if (!+bytes) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
};

// --- STATIC FALLBACK DATA ---
const FILE_SYSTEM_DATA = [
  { id: 'mkt', path: 'Marketing', type: 'folder' },
  { id: 'mkt-23', path: 'Marketing/2023', type: 'folder' },
  { id: 'mkt-img1', path: 'Marketing/2023/campaign_launch.jpg', type: 'file' },
  { id: 'prod', path: 'Products', type: 'folder' },
  { id: 'prod-chair', path: 'Products/Chairs', type: 'folder' },
  { id: 'prod-chair-1', path: 'Products/Chairs/Modern_Armchair.png', type: 'file' },
  { id: 'users', path: 'Users', type: 'folder' },
  { id: 'users-younes', path: 'Users/Younes', type: 'folder' },
  { id: 'users-docs', path: 'Users/Younes/Documents', type: 'folder' },
  { id: 'doc-resume', path: 'Users/Younes/Documents/Resume_2025.pdf', type: 'file' },
  { id: 'root-img1', path: 'logo_v2.png', type: 'file' },
];



// ✅ resolve public Cloudflare delivery URL for an image.
function resolveCloudflareImageUrl(item) {
  const cfId = String(item?.cfImageId || item?.cf_image_id || item?.id || item?.path || '').trim();
  if (!cfId) return '';

  const base =
    (typeof window !== 'undefined' && window.__CF_IMAGE_DELIVERY_BASE) ||
    process?.env?.NEXT_PUBLIC_CF_IMAGE_DELIVERY_BASE ||
    process?.env?.NEXT_PUBLIC_CF_IMAGE_BASE ||
    process?.env?.NEXT_PUBLIC_CF_IMAGES_DELIVERY_BASE ||
    '';

  const variant = process?.env?.NEXT_PUBLIC_CF_IMAGE_VARIANT || 'public';
  if (!base) return '';

  const b = String(base).replace(/\/+$/, '');
  const encodedId = encodeURIComponent(cfId); // important for ids with "/"
  return `${b}/${encodedId}/${variant}`;
}





export default function CloudflareFolderSelector({
  onFolderSelect,
  onFilesDrop,
  onOpenLocalFilesPicker,
  onOpenLocalFolderPicker,
  pendingFiles = [],
  pendingTarget = '',
  refreshKey = 0,
}) {
  const [loading, setLoading] = useState(true);
  const [currentPath, setCurrentPath] = useState(''); // '' means ROOT
  const [selectedItem, setSelectedItem] = useState(null);
  const [isDragActive, setIsDragActive] = useState(false);

  const [serverItems, setServerItems] = useState(FILE_SYSTEM_DATA);
  const [fallbackMsg, setFallbackMsg] = useState(null);
  const [sortKey, setSortKey] = useState(SORT_DEFAULT.key);
  const [sortDir, setSortDir] = useState(SORT_DEFAULT.dir);

  useEffect(() => {
    onFolderSelect?.(currentPath);
  }, [currentPath, onFolderSelect]);

  // load saved sort preference
  useEffect(() => {
    try {
      const raw = typeof window !== 'undefined' ? window.localStorage.getItem(SORT_STORAGE_KEY) : null;
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.key) setSortKey(parsed.key);
        if (parsed?.dir) setSortDir(parsed.dir);
      }
    } catch { }
  }, []);

  // persist sort preference
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(SORT_STORAGE_KEY, JSON.stringify({ key: sortKey, dir: sortDir }));
      }
    } catch { }
  }, [sortKey, sortDir]);

  // UI-only hint
  const [hintMsg, setHintMsg] = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');
  const [previewTitle, setPreviewTitle] = useState('');
  const [previewBusy, setPreviewBusy] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    title: '',
    message: '',
    items: [],
    confirmLabel: 'Confirm',
    cancelLabel: 'Cancel',
    confirmColor: 'error',
  });
  const [confirmBusy, setConfirmBusy] = useState(false);
  const confirmActionRef = useRef(null);

  // Context menu state
  const [ctx, setCtx] = useState(null);

  // Submenu state
  const [subCtx, setSubCtx] = useState(null);

  // timers only for submenu
  const closeTimersRef = useRef({ sub: null });

  // rename inline state
  const [renamingPath, setRenamingPath] = useState('');
  const [renamingType, setRenamingType] = useState('');
  const [renameValue, setRenameValue] = useState('');
  const [renamingBusy, setRenamingBusy] = useState(false);
  const [tempNewFolderPath, setTempNewFolderPath] = useState('');
  const renameInputRef = useRef(null);

  const clearTimers = useCallback(() => {
    const t = closeTimersRef.current;
    if (t.sub) clearTimeout(t.sub);
    closeTimersRef.current.sub = null;
  }, []);

  const closeCtx = useCallback(() => {
    clearTimers();
    setSubCtx(null);
    setCtx(null);
  }, [clearTimers]);

  useEffect(() => {
    if (renamingPath && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [renamingPath]);

  // local-only hiding of pending items
  const [hiddenPendingPrefixes, setHiddenPendingPrefixes] = useState(() => new Set());

  useEffect(() => {
    setHiddenPendingPrefixes(new Set());
  }, [refreshKey]);

  const sortItems = useCallback(
    (items) => {
      const dir = sortDir === 'desc' ? -1 : 1;
      const parseDate = (it) => {
        const d = it?.cfUploadedAt || it?.cf_uploaded_at || it?.createdAt || it?.created_at;
        const t = d ? Date.parse(d) : 0;
        return Number.isFinite(t) ? t : 0;
      };
      const getName = (it) => String(it?.name || it?.path || '').toLowerCase();
      const getSize = (it) => Number(it?.sizeBytes ?? 0) || 0;
      const getTypeLabel = (it) => String(it?.mimeType || it?.extension || '').toLowerCase();

      return [...items].sort((a, b) => {
        if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;

        let cmp = 0;
        switch (sortKey) {
          case 'size':
            cmp = getSize(a) - getSize(b);
            break;
          case 'date':
            cmp = parseDate(a) - parseDate(b);
            break;
          case 'type':
            cmp = getTypeLabel(a).localeCompare(getTypeLabel(b)) || getName(a).localeCompare(getName(b));
            break;
          case 'name':
          default:
            cmp = getName(a).localeCompare(getName(b));
            break;
        }

        if (cmp === 0) cmp = getName(a).localeCompare(getName(b));

        return cmp * dir;
      });
    },
    [sortKey, sortDir]
  );

  const isHiddenPending = useCallback(
    (path) => {
      const p = String(path || '');
      if (!p) return false;
      for (const pref of hiddenPendingPrefixes) {
        if (!pref) continue;
        if (p === pref) return true;
        if (p.startsWith(pref + '/')) return true;
      }
      return false;
    },
    [hiddenPendingPrefixes]
  );

  const refetchNow = useCallback(async () => {
    try {
      setLoading(true);
      setFallbackMsg(null);

      try {
        await syncCloudflareFs(currentPath || '');
      } catch (e) {
        console.error('[cf][sync]', e);
      }

      const res = await fetchCloudflareFs('');
      if (res?.ok && Array.isArray(res.items)) {
        setServerItems(res.items);
        setFallbackMsg(null);
      } else {
        setServerItems(FILE_SYSTEM_DATA);
        setFallbackMsg(
          `Using fallback folder data (Cloudflare API not available). Reason: ${res?.message || 'Unknown error'}`
        );
      }
    } catch (err) {
      setServerItems(FILE_SYSTEM_DATA);
      setFallbackMsg(
        `Using fallback folder data (Cloudflare API not available). Reason: ${err?.message || 'Network error'}`
      );
    } finally {
      setLoading(false);
    }
  }, [currentPath]);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoading(true);
        setFallbackMsg(null);

        try {
          await syncCloudflareFs('');
        } catch (e) {
          console.error('[cf][sync:init]', e);
        }

        const res = await fetchCloudflareFs('');
        if (!alive) return;

        if (res?.ok && Array.isArray(res.items)) {
          setServerItems(res.items);
          setFallbackMsg(null);
        } else {
          setServerItems(FILE_SYSTEM_DATA);
          setFallbackMsg(
            `Using fallback folder data (Cloudflare API not available). Reason: ${res?.message || 'Unknown error'}`
          );
        }
      } catch (err) {
        if (!alive) return;
        setServerItems(FILE_SYSTEM_DATA);
        setFallbackMsg(
          `Using fallback folder data (Cloudflare API not available). Reason: ${err?.message || 'Network error'}`
        );
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [refreshKey]);

  // --- LOGIC: MERGE Server Data + Pending Uploads ---
  const currentItems = useMemo(() => {
    if (loading) return [];

    let allItems = [...serverItems];

    if (pendingFiles.length > 0) {
      const pendingNodes = pendingFiles
        .map((f) => {
          const rel = String(f.hier || f.fileName || '')
            .replace(/^\/+/, '')
            .replace(/\/{2,}/g, '/')
            .trim();

          const target = String(pendingTarget || '')
            .replace(/^\/+/, '')
            .replace(/\/+$/, '')
            .replace(/\/{2,}/g, '/')
            .trim();

          const fullPath = target
            ? rel.startsWith(target + '/')
              ? rel
              : `${target}/${rel}`
            : rel;

          return {
            ...f,
            id: `pending-${f.id}`,
            path: String(fullPath || '').replace(/\/{2,}/g, '/'),
            type: 'file',
            isPending: true,
          };
        })
        .filter((node) => node.path && !isHiddenPending(node.path));

      allItems = [...allItems, ...pendingNodes];
    }

    const validItems = allItems.filter((item) => {
      if (currentPath === '') return true;
      return item.path.startsWith(currentPath + '/');
    });

    const displayMap = new Map();

    validItems.forEach((item) => {
      const relativePath = currentPath === '' ? item.path : item.path.slice(currentPath.length + 1);
      if (!relativePath) return;

      const parts = String(relativePath).split('/').filter(Boolean);
      if (!parts.length) return;

      if (parts.length === 1) {
        displayMap.set(item.path, { ...item, name: parts[0] });
      } else {
        const folderName = parts[0];
        const folderPath = currentPath ? `${currentPath}/${folderName}` : folderName;

        const isPendingChild = Boolean(item.isPending);
        const isServerChild = !isPendingChild && item.type === 'file';

        if (!displayMap.has(folderPath)) {
          displayMap.set(folderPath, {
            id: `virtual-folder-${folderPath}`,
            path: folderPath,
            name: folderName,
            type: 'folder',
            hasPendingChild: isPendingChild,
            hasServerChild: isServerChild,
          });
        } else {
          const existing = displayMap.get(folderPath);
          displayMap.set(folderPath, {
            ...existing,
            hasPendingChild: Boolean(existing?.hasPendingChild) || isPendingChild,
            hasServerChild: Boolean(existing?.hasServerChild) || isServerChild,
          });
        }
      }
    });

    const items = Array.from(displayMap.values()).map((it) => {
      if (it.type !== 'folder') return it;

      const hasPendingChild = Boolean(it.hasPendingChild);
      const hasServerChild = Boolean(it.hasServerChild);

      return {
        ...it,
        isPending: hasPendingChild,
        pendingOnly: hasPendingChild && !hasServerChild,
      };
    });

    return items.sort((a, b) => {
      if (a.type === b.type) return a.name.localeCompare(b.name);
      return a.type === 'folder' ? -1 : 1;
    });
  }, [currentPath, loading, pendingFiles, pendingTarget, serverItems, isHiddenPending]);

  // Rubber-band selection
  const {
    selectedKeys,
    setSelectedKeys,
    clearSelection,
    containerRef: itemsContainerRef,
    itemRefs,
    isSelecting,
    selectionBox,
    handleMouseDown: handleBandMouseDown,
    handleItemClick: handleBandItemClick,
  } = useRubberBandSelection({
    items: sortItems(currentItems),
    getKey: (it) => String(it?.path || it?.id || ''),
  });

  // Avoid clearing selection on the click that follows a band drag
  const suppressClearClickRef = useRef(false);
  const prevIsSelectingRef = useRef(false);
  useEffect(() => {
    let timer = null;
    if (prevIsSelectingRef.current && !isSelecting) {
      suppressClearClickRef.current = true;
      timer = setTimeout(() => {
        suppressClearClickRef.current = false;
      }, 50);
    }
    prevIsSelectingRef.current = isSelecting;
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [isSelecting]);

  useEffect(() => {
    const arr = Array.from(selectedKeys || []);
    if (!arr.length) {
      console.log('[cf][selection] cleared');
      if (selectedItem) setSelectedItem(null);
      return;
    }

    console.log('[cf][selection]', arr);

    const next = sortItems(currentItems).find((it) => arr.includes(String(it.path || it.id || ''))) || null;
    if ((next?.path || '') !== (selectedItem?.path || '')) {
      setSelectedItem(next);
    }
  }, [selectedKeys, currentItems, selectedItem, sortItems]);

  const openCtx = useCallback(
    (e, item) => {
      e.preventDefault();
      e.stopPropagation();

      if (item) {
        const key = String(item.path || item.id || '');
        setSelectedKeys((prev) => {
          if (prev.has(key)) return prev;
          return new Set([key]);
        });
        setSelectedItem(item);
      }

      console.debug('[cf][ctx-open]', {
        target: item?.path || '(background)',
        selectionCount: selectedKeys.size,
      });

      setSubCtx(null);
      setCtx({
        mouseX: e.clientX + 2,
        mouseY: e.clientY - 6,
        item: item || null,
      });
    },
    [setSelectedKeys, setSelectedItem, selectedKeys.size]
  );

  const allKnownItems = useMemo(() => {
    let merged = [...serverItems];

    if (pendingFiles.length > 0) {
      const pendingNodes = pendingFiles
        .map((f) => {
          const rel = String(f.hier || f.fileName || '')
            .replace(/^\/+/, '')
            .replace(/\/{2,}/g, '/')
            .trim();

          const target = String(pendingTarget || '')
            .replace(/^\/+/, '')
            .replace(/\/+$/, '')
            .replace(/\/{2,}/g, '/')
            .trim();

          const fullPath = target
            ? rel.startsWith(target + '/')
              ? rel
              : `${target}/${rel}`
            : rel;

          return {
            ...f,
            path: String(fullPath || '').replace(/\/{2,}/g, '/'),
            name: f.fileName || f.name || fullPath.split('/').pop(),
            type: 'file',
          };
        })
        .filter((node) => node.path);

      merged = [...merged, ...pendingNodes];
    }

    return merged;
  }, [serverItems, pendingFiles, pendingTarget]);

  const getSiblingNames = useCallback(
    (basePath) => {
      const target = String(basePath || '');
      const names = new Set();

      allKnownItems.forEach((it) => {
        const parent = it.path.includes('/') ? it.path.slice(0, it.path.lastIndexOf('/')) : '';
        if (parent === target) {
          const nm = String(it.name || it.path.split('/').pop() || '').trim();
          if (nm) names.add(nm);
        }
      });

      return names;
    },
    [allKnownItems]
  );

  const resolveType = useCallback(
    (t, fallbackType = 'file') =>
      String(
        t?.type === 'folder_open' || t?.type === 'root'
          ? 'folder'
          : t?.type || fallbackType || 'file'
      ).toLowerCase(),
    []
  );

  const navigateToPath = useCallback(
    (path) => {
      const p = String(path || '').replace(/^\/+/, '').replace(/\/{2,}/g, '/');
      setCurrentPath(p);
      setSelectedItem(null);
      onFolderSelect?.(p);
    },
    [onFolderSelect]
  );

  const closeConfirmDialog = useCallback(() => {
    if (confirmBusy) return;
    setConfirmDialog((prev) => ({ ...prev, open: false }));
    confirmActionRef.current = null;
  }, [confirmBusy]);

  const performDeleteTargets = useCallback(
    async (actionableTargets) => {
      if (!actionableTargets?.length) return;

      const fileTargets = actionableTargets.filter((t) => resolveType(t) === 'file');
      const folderTargets = actionableTargets.filter((t) => resolveType(t) === 'folder');

      setHintMsg(`Deleting ${actionableTargets.length} item(s)...`);

      let okCount = 0;
      const failed = [];
      let navigateAdjusted = false;

      // Delete folders first (so children are cleaned up server-side), then files.
      const ordered = [...folderTargets, ...fileTargets];

      for (const t of ordered) {
        const resolvedType = resolveType(t);
        const path = String(t.path || '').trim();
        const id = String(t.id || '').trim();

        try {
          if (resolvedType === 'folder') {
            if (!path) throw new Error('Missing folder path.');

            let ok = false;
            let lastMessage = '';

            try {
              const res = await deleteCloudflareEntry({
                type: 'folder',
                path,
                id,
                dryRun: false,
              });
              if (res?.ok || res?.message === 'Nothing matched.') ok = true;
              lastMessage = res?.message || lastMessage;
            } catch (e) {
              lastMessage = e?.message || lastMessage;
            }

            try {
              const resDb = await deleteDbFolder(path, 'cloudflare-ui');
              if (resDb?.ok) ok = true;
              lastMessage = resDb?.message || lastMessage;
            } catch (e) {
              lastMessage = e?.message || lastMessage;
            }

            if (!ok) throw new Error(lastMessage || 'Delete failed.');

            if (!navigateAdjusted && currentPath && (currentPath === path || currentPath.startsWith(path + '/'))) {
              const parent = path.includes('/') ? path.slice(0, path.lastIndexOf('/')) : '';
              navigateToPath(parent);
              navigateAdjusted = true;
            }
          } else {
            const res = await deleteCloudflareEntry({
              type: 'file',
              id,
              path,
              dryRun: false,
            });

            if (!res?.ok) throw new Error(res?.message || 'Delete failed.');
          }

          okCount += 1;
        } catch (err) {
          failed.push({ path: path || id || '(unknown)', message: err?.message || 'Delete failed.' });
        }
      }

      setSelectedKeys(new Set());
      setSelectedItem(null);

      if (okCount > 0) {
        await refetchNow();
      }

      if (failed.length) {
        const list = failed.map((f) => f.path).join(', ');
        setHintMsg(`Deleted ${okCount} item(s); failed ${failed.length}: ${list}`);
      } else {
        setHintMsg(`✅ Deleted ${okCount} item(s).`);
      }
    },
    [currentPath, navigateToPath, refetchNow, resolveType, setSelectedItem, setSelectedKeys, setHintMsg]
  );

  const confirmAndRun = useCallback(async () => {
    if (!confirmActionRef.current) {
      closeConfirmDialog();
      return;
    }
    setConfirmBusy(true);
    try {
      await confirmActionRef.current();
    } finally {
      setConfirmBusy(false);
      setConfirmDialog((prev) => ({ ...prev, open: false }));
      confirmActionRef.current = null;
    }
  }, [closeConfirmDialog, setConfirmDialog]);

  // --- HANDLERS ---
  const handleItemClick = (item, e) => {
    handleBandItemClick(item, e);
    setSelectedItem(item);
    console.debug('[cf][click]', { path: item?.path, type: item?.type });
  };

  const openPreviewDialog = useCallback(
    async (target) => {
      try {
        const cfId = String(target?.cfImageId || target?.cf_image_id || target?.path || target?.id || '').trim();
        if (!cfId) throw new Error('Missing image id/path');

        setPreviewOpen(true);
        setPreviewBusy(true);
        setPreviewTitle(target?.name || target?.file_name || cfId);

        const variant = process?.env?.NEXT_PUBLIC_CF_IMAGE_VARIANT || 'public';
        let url = '';
        try {
          url = buildDeliveryUrl({ cf_image_id: cfId, variantOrTransform: variant });
        } catch {
          url = resolveCloudflareImageUrl(target);
        }
        setPreviewUrl(url || '');
      } catch (e) {
        console.error('[cf][preview]', e);
        setHintMsg(e?.message || 'Preview failed.');
        setPreviewOpen(false);
      } finally {
        setPreviewBusy(false);
      }
    },
    [setHintMsg]
  );

  const openPreviewInNewTab = useCallback(
    (target) => {
      try {
        const cfId = String(
          target?.path || target?.id || target?.cfImageId || target?.cf_image_id || target?.file_name || ''
        ).trim();
        if (!cfId) throw new Error('Missing image id/path');

        const variant = process?.env?.NEXT_PUBLIC_CF_IMAGE_VARIANT || 'public';
        let url = '';
        try {
          url = buildDeliveryUrl({ cf_image_id: cfId, variantOrTransform: variant });
        } catch { }
        if (!url) url = resolveCloudflareImageUrl(target);

        if (!url) throw new Error('Unable to build delivery URL');

        if (typeof window !== 'undefined') {
          window.open(url, '_blank', 'noopener,noreferrer');
        }
      } catch (e) {
        console.error('[cf][preview-new-tab]', e);
        setHintMsg(e?.message || 'Open failed.');
      }
    },
    [setHintMsg]
  );

  const handleItemDoubleClick = (item) => {
    if (item.type === 'folder') {
      if (item.pendingOnly) {
        setHintMsg('Pending folder: please use the table below to upload first.');
        return;
      }
      navigateToPath(item.path);
      return;
    }

    if (item.type === 'file') {
      const lower = String(item.name || '').toLowerCase();
      const isPdf = lower.endsWith('.pdf');
      if (isPdf) openPreviewInNewTab(item);
      else openPreviewDialog(item);
    }
  };

  const handleGoUp = () => {
    if (currentPath === '') return;
    const lastSlashIndex = currentPath.lastIndexOf('/');
    const newPath = lastSlashIndex === -1 ? '' : currentPath.substring(0, lastSlashIndex);
    navigateToPath(newPath);
  };

  const handleBreadcrumbClick = (segmentIndex) => {
    let newPath = '';
    if (segmentIndex !== -1) {
      const parts = currentPath.split('/').filter(Boolean);
      newPath = parts.slice(0, segmentIndex + 1).join('/');
    }
    navigateToPath(newPath);
  };

  // --- DRAG HANDLERS ---
  const handleDragEnter = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    if (e.currentTarget.contains(e.relatedTarget)) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    async (e) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragActive(false);
      onFilesDrop?.(e.dataTransfer, currentPath);
    },
    [onFilesDrop, currentPath]
  );

  // --- ICON HELPERS ---
  const displayItem =
    selectedItem || {
      name: currentPath === '' ? 'Cloudflare Root' : currentPath.split('/').pop(),
      path: currentPath === '' ? 'Root' : currentPath,
      type: currentPath === '' ? 'root' : 'folder_open',
    };

  const getIcon = (type, fileName, isLarge = false, isPending = false) => {
    const fontSize = isLarge ? 70 : 60;
    const shadow = isLarge ? '' : 'drop-shadow(0px 2px 2px rgba(0,0,0,0.1))';
    const opacity = isPending ? 0.7 : 1;

    if (type === 'root') return <CloudQueueIcon sx={{ fontSize, color: '#F48120', mb: 1 }} />;
    if (type === 'folder_open') return <FolderOpenIcon sx={{ fontSize, color: '#FFC107', mb: 1 }} />;
    if (type === 'folder')
      return <FolderIcon sx={{ fontSize, color: '#FFC107', mb: 1, filter: shadow, opacity }} />;
    if (fileName?.endsWith('.pdf'))
      return <DescriptionIcon sx={{ fontSize, color: '#f44336', mb: 1, opacity }} />;
    return <InsertPhotoIcon sx={{ fontSize, color: '#4caf50', mb: 1, opacity }} />;
  };

  // --- Context menu model (from helper) ---
  const baseMenuModel = useMemo(() => {
    return buildExplorerContextMenuModel({
      item: ctx?.item || null,
      currentPath,
    });
  }, [ctx?.item, currentPath]);

  // Patch: if user right-clicks a pending-only folder, allow UI-only hide
  const menuModel = useMemo(() => {
    const it = ctx?.item;
    if (it?.type === 'folder' && it?.pendingOnly) {
      return [
        {
          key: 'pending-folder-remove',
          label: 'Remove pending folder from view',
          action: MENU_ACTION.REMOVE_PENDING,
          payload: { path: it.path, item: it },
          disabled: false,
          danger: true,
          hint: 'UI only',
          iconKey: 'remove',
        },
        { key: 'pending-folder-div', divider: true },
        ...baseMenuModel,
      ];
    }
    return baseMenuModel;
  }, [baseMenuModel, ctx?.item]);

  const iconByKey = useMemo(
    () => ({
      delete: <DeleteIcon fontSize="small" />,
      remove: <RemoveCircleOutlineIcon fontSize="small" />,
      copy: <ContentCopyIcon fontSize="small" />,
      refresh: <RefreshIcon fontSize="small" />,
      info: <InfoOutlinedIcon fontSize="small" />,
      code: <CodeIcon fontSize="small" />,
      link: <LinkIcon fontSize="small" />,
      fingerprint: <FingerprintIcon fontSize="small" />,
      table: <TableViewIcon fontSize="small" />,
      rename: <DriveFileRenameOutlineIcon fontSize="small" />,
      upload: <UploadFileIcon fontSize="small" />,
      'upload-folder': <UploadFileIcon fontSize="small" />,
      'folder-plus': <CreateNewFolderIcon fontSize="small" />,
      paste: <ContentPasteIcon fontSize="small" />,
      preview: <VisibilityIcon fontSize="small" />,
      'preview-tab': <PreviewIcon fontSize="small" />,
      open: <FolderOpenIcon fontSize="small" />,
      'open-tab': <OpenInNewIcon fontSize="small" />,
      launch: <LaunchIcon fontSize="small" />,
      view: <ViewModuleIcon fontSize="small" />,
      sort: <SortIcon fontSize="small" />,
    }),
    []
  );

  const cancelRename = useCallback(
    (opts = {}) => {
      const keepTemp = Boolean(opts?.keepTemp);

      if (!keepTemp && tempNewFolderPath && renamingPath === tempNewFolderPath) {
        setServerItems((prev) => prev.filter((it) => it.path !== tempNewFolderPath));
        setTempNewFolderPath('');
      }

      setRenamingPath('');
      setRenamingType('');
      setRenameValue('');
    },
    [renamingPath, tempNewFolderPath, setServerItems, setTempNewFolderPath]
  );

  const startRename = useCallback(
    (target) => {
      if (!target) return;

      const typeRaw =
        target.type === 'folder_open'
          ? 'folder'
          : target.type === 'root'
            ? 'root'
            : target.type || '';

      const path = String(target.path || '').trim();
      if (!path || typeRaw === 'root') {
        setHintMsg('Root cannot be renamed.');
        return;
      }

      if (target.isPending || target.pendingOnly) {
        setHintMsg('Pending items cannot be renamed yet.');
        return;
      }

      if (typeRaw === 'folder' && target.hasServerChild) {
        setHintMsg('Folder rename is disabled once it contains assets (Cloudflare IDs are immutable).');
        return;
      }

      const baseName = String(target.name || path.split('/').pop() || '').trim();
      setRenamingPath(path);
      setRenamingType(String(typeRaw || '').toLowerCase());
      setRenameValue(baseName);
    },
    [setHintMsg]
  );

  const commitRename = useCallback(() => {
    if (!renamingPath || !renamingType) {
      cancelRename();
      return;
    }

    const safeName = renameValue.trim().replace(/[/\\\\]/g, '');
    if (!safeName) {
      setHintMsg('Name required.');
      return;
    }

    const parent = renamingPath.includes('/') ? renamingPath.slice(0, renamingPath.lastIndexOf('/')) : '';
    const newPath = parent ? `${parent}/${safeName}`.replace(/\/{2,}/g, '/') : safeName;

    if (newPath === renamingPath) {
      cancelRename();
      return;
    }

    const isTempNew = tempNewFolderPath && renamingPath === tempNewFolderPath;

    const siblings = getSiblingNames(parent);
    if (siblings.has(safeName) && newPath !== renamingPath) {
      setHintMsg('A folder with this name already exists here.');
      return;
    }

    setRenamingBusy(true);

    (async () => {
      try {
        if (isTempNew) {
          setServerItems((prev) => prev.filter((it) => it.path !== renamingPath));
          const resCreate = await createDbFolder(newPath, 'cloudflare-ui');
          if (!resCreate?.ok) throw new Error(resCreate?.message || 'Create failed.');
          await refetchNow();
          setHintMsg(`✅ Created folder "${newPath}".`);
        } else {
          const res = await renameCloudflarePath({
            type: renamingType === 'folder' ? 'folder' : 'file',
            from: renamingPath,
            to: newPath,
            createdBy: 'cloudflare-ui',
          });

          if (!res?.ok) throw new Error(res?.message || 'Rename failed.');

          // keep selection and current path in sync
          if (
            currentPath &&
            renamingType === 'folder' &&
            (currentPath === renamingPath || currentPath.startsWith(renamingPath + '/'))
          ) {
            const updated = `${newPath}${currentPath.slice(renamingPath.length)}`;
            navigateToPath(updated);
          }

          if (selectedItem && selectedItem.path) {
            if (
              selectedItem.path === renamingPath ||
              (renamingType === 'folder' && selectedItem.path.startsWith(renamingPath + '/'))
            ) {
              const updatedPath =
                renamingType === 'folder'
                  ? `${newPath}${selectedItem.path.slice(renamingPath.length)}`
                  : newPath;
              setSelectedItem({ ...selectedItem, path: updatedPath, name: safeName });
            }
          }

          await refetchNow();
          setHintMsg(`✅ Renamed to "${newPath}".`);
        }
      } catch (err) {
        setHintMsg(err?.message || 'Rename failed.');
      } finally {
        setRenamingBusy(false);
        setTempNewFolderPath('');
        cancelRename({ keepTemp: true });
      }
    })();
  }, [
    cancelRename,
    currentPath,
    navigateToPath,
    renameValue,
    renamingPath,
    renamingType,
    selectedItem,
    setHintMsg,
    refetchNow,
    tempNewFolderPath,
    getSiblingNames,
    setServerItems,
  ]);

  const runAction = useCallback(
    async (entry) => {
      const action = entry?.action;
      const payload = entry?.payload || {};
      const item = ctx?.item || null;

      // close menus first
      closeCtx();
      if (!action) return;

      try {
        switch (action) {
          case MENU_ACTION.REFRESH: {
            await refetchNow();
            setHintMsg('Refreshed.');
            return;
          }

          case MENU_ACTION.RENAME: {
            const target =
              item ||
              payload?.item || {
                path: payload?.path,
                type: payload?.type,
                name: payload?.name,
                isPending: payload?.isPending,
                pendingOnly: payload?.pendingOnly,
                hasServerChild: payload?.hasServerChild,
              };
            startRename(target);
            return;
          }

          case MENU_ACTION.OPEN: {
            const path = String(payload?.path ?? item?.path ?? '');
            const tgt = String(path || '').replace(/^\/+/, '').replace(/\/{2,}/g, '/');

            if (item?.type === 'folder' && item?.pendingOnly) {
              setHintMsg('Pending folder: please use the table below to upload first.');
              return;
            }

            navigateToPath(tgt);
            return;
          }

          case MENU_ACTION.PREVIEW: {
            const target =
              payload?.item ||
              item ||
              (payload?.path ? { path: payload.path, name: payload?.name || payload?.path } : null);
            await openPreviewDialog(target);
            return;
          }

          case MENU_ACTION.PREVIEW_NEW_TAB: {
            const target =
              payload?.item ||
              item ||
              (payload?.path ? { path: payload.path, name: payload?.name || payload?.path } : null);
            openPreviewInNewTab(target);
            return;
          }

          case MENU_ACTION.SHOW_IN_TABLE: {
            const selectionList = Array.from(selectedKeys || []);
            const selectedItems =
              selectionList.length > 0
                ? selectionList.map((p) => currentItems.find((it) => it.path === p) || { path: p })
                : [];

            const fallbackPath = String(payload?.path ?? item?.path ?? currentPath ?? '').trim();
            const paths =
              selectedItems.length > 0
                ? selectedItems.map((it) => String(it.path || '').trim()).filter(Boolean)
                : fallbackPath
                  ? [fallbackPath]
                  : [];

            const kind =
              String(payload?.kind || '') ||
              (selectedItems.length === 1
                ? selectedItems[0].type === 'file'
                  ? 'file'
                  : selectedItems[0].type === 'folder'
                    ? 'folder'
                    : 'background'
                : 'multi');

            if (typeof window !== 'undefined') {
              window.dispatchEvent(
                new CustomEvent('cf:show-table', {
                  detail: {
                    path: paths[0] || '',
                    paths,
                    selection: selectedItems.map((it) => ({ path: it.path, type: it.type })),
                    kind,
                    currentPath,
                  },
                })
              );
            }

            setHintMsg(
              paths.length > 1
                ? `Loading ${paths.length} item(s) in table...`
                : 'Loading in table...'
            );
            return;
          }

          case MENU_ACTION.SORT_NAME:
          case MENU_ACTION.SORT_TYPE:
          case MENU_ACTION.SORT_SIZE:
          case MENU_ACTION.SORT_DATE: {
            const keyMap = {
              [MENU_ACTION.SORT_NAME]: 'name',
              [MENU_ACTION.SORT_TYPE]: 'type',
              [MENU_ACTION.SORT_SIZE]: 'size',
              [MENU_ACTION.SORT_DATE]: 'date',
            };
            const key = keyMap[action] || 'name';
            const nextDir = key === sortKey ? (sortDir === 'asc' ? 'desc' : 'asc') : 'asc';
            setSortKey(key);
            setSortDir(nextDir);
            console.debug('[cf][sort]', { key, dir: nextDir });
            setHintMsg(`Sorted by ${key} (${nextDir}).`);
            return;
          }

          case MENU_ACTION.NEW_FOLDER: {
            const basePath = String(payload?.path ?? currentPath ?? '').trim();
            const siblings = getSiblingNames(basePath);
            const baseName = 'New Folder';
            let name = baseName;
            let idx = 2;
            while (siblings.has(name)) {
              name = `${baseName} ${idx}`;
              idx += 1;
            }

            const tempPath = basePath ? `${basePath}/${name}`.replace(/\/{2,}/g, '/') : name;
            const tempItem = {
              id: `temp-folder-${Date.now()}`,
              path: tempPath,
              name,
              type: 'folder',
              isPending: false,
              pendingOnly: false,
            };

            setTempNewFolderPath(tempPath);
            setServerItems((prev) => [...prev.filter((it) => it.path !== tempPath), tempItem]);
            setSelectedItem(tempItem);
            startRename(tempItem);
            return;
          }

          case MENU_ACTION.UPLOAD_FILES: {
            if (typeof onOpenLocalFilesPicker === 'function') {
              onOpenLocalFilesPicker();
              return;
            }
            if (typeof window !== 'undefined') {
              window.dispatchEvent(
                new CustomEvent('cf:open-local-files-picker', { detail: { path: currentPath } })
              );
              return;
            }
            setHintMsg('Local file picker unavailable here.');
            return;
          }

          case MENU_ACTION.UPLOAD_FOLDER: {
            if (typeof onOpenLocalFolderPicker === 'function') {
              onOpenLocalFolderPicker();
              return;
            }
            if (typeof window !== 'undefined') {
              window.dispatchEvent(
                new CustomEvent('cf:open-local-folder-picker', { detail: { path: currentPath } })
              );
              return;
            }
            setHintMsg('Local folder picker unavailable here.');
            return;
          }

          case MENU_ACTION.DUPLICATE_UPLOAD: {
            const path = String(payload?.path ?? item?.path ?? '').trim();
            if (!path) {
              setHintMsg('Missing folder path.');
              return;
            }
            try {
              setHintMsg(`Duplicating "${path}"...`);
              const res = await fetch('/api/cloudflare/duplicate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ path }),
              }).then((r) => r.json());

              if (!res?.ok) throw new Error(res?.message || 'Duplicate failed');

              setHintMsg(
                `Copy created at ${res.targetPrefix ? `/${res.targetRoot}/${res.targetPrefix}` : `/${res.targetRoot}`
                }. Refreshing...`
              );
              await refetchNow();
            } catch (e) {
              setHintMsg(e?.message || 'Duplicate failed.');
            }
            return;
          }

          case MENU_ACTION.COPY_PATH: {
            const ok = await copyToClipboard(payload?.text ?? item?.path ?? '');
            setHintMsg(ok ? 'Path copied.' : 'Copy failed.');
            return;
          }

          case MENU_ACTION.COPY_NAME: {
            const ok = await copyToClipboard(payload?.text ?? item?.name ?? '');
            setHintMsg(ok ? 'Name copied.' : 'Copy failed.');
            return;
          }

          case MENU_ACTION.COPY_ID: {
            const ok = await copyToClipboard(payload?.text ?? String(item?.id ?? ''));
            setHintMsg(ok ? 'ID copied.' : 'Copy failed.');
            return;
          }

          case MENU_ACTION.COPY_URL: {
            const cfId = String(
              payload?.cf_image_id || item?.cfImageId || item?.cf_image_id || item?.path || item?.id || ''
            ).trim();

            if (!cfId) {
              setHintMsg('No image id/path to copy.');
              return;
            }

            let url = '';
            try {
              const variant = process?.env?.NEXT_PUBLIC_CF_IMAGE_VARIANT || 'public';
              url = buildDeliveryUrl({ cf_image_id: cfId, variantOrTransform: variant });
            } catch {
              url = resolveCloudflareImageUrl(item);
            }

            const toCopy = url || cfId;
            let ok = await copyToClipboard(toCopy);

            if (!ok && typeof window !== 'undefined') {
              try {
                window.prompt('Copy Cloudflare URL', toCopy);
                ok = true;
              } catch { }
            }

            setHintMsg(ok ? `Cloudflare image URL ready: ${toCopy}` : `Copy failed. URL: ${toCopy}`);
            return;
          }

          case MENU_ACTION.COPY_JSON: {
            const text = stringifyForClipboard(payload?.json ?? item ?? {});
            const ok = await copyToClipboard(text);
            setHintMsg(ok ? 'JSON copied.' : 'Copy failed.');
            return;
          }

          case MENU_ACTION.REMOVE_PENDING: {
            const path = String(payload?.path ?? item?.path ?? '');
            if (!path) return;

            if (!item?.isPending && !item?.pendingOnly) {
              setHintMsg('This item is not pending.');
              return;
            }

            setHiddenPendingPrefixes((prev) => {
              const next = new Set(prev);
              next.add(path);
              return next;
            });

            if (selectedItem?.path === path) setSelectedItem(null);
            setHintMsg('Removed from pending view. (UI only)');
            return;
          }

          case MENU_ACTION.DELETE: {
            const selectionList = Array.from(selectedKeys || []);
            const ctxKey = String(item?.path || item?.id || '').trim();

            // If multiple items are selected and the context menu was opened on one of them,
            // delete the whole selection. Otherwise fall back to the single ctx/payload item.
            const deleteKeys =
              selectionList.length > 1 && ctxKey && selectionList.includes(ctxKey)
                ? selectionList
                : selectionList.length > 0 && !ctxKey
                  ? selectionList
                  : ctxKey
                  ? [ctxKey]
                  : [String(payload?.path || payload?.id || '').trim()].filter(Boolean);

            const targets = deleteKeys
              .map((k) => {
                const found = currentItems.find((it) => String(it.path || it.id || '') === k);
                if (found) return found;
                return { path: k, id: k, type: payload?.type || item?.type || 'file' };
              })
              .filter((t) => t.path || t.id);

            if (!targets.length) {
              setHintMsg('Nothing selected to delete.');
              return;
            }

            const pendingOnlyTargets = targets.filter((t) => t.isPending || t.pendingOnly);
            if (pendingOnlyTargets.length) {
              setHiddenPendingPrefixes((prev) => {
                const next = new Set(prev);
                pendingOnlyTargets.forEach((t) => {
                  const p = String(t.path || '');
                  if (p) next.add(p);
                });
                return next;
              });
              setSelectedKeys((prev) => {
                const next = new Set(prev);
                pendingOnlyTargets.forEach((t) => {
                  const p = String(t.path || t.id || '');
                  if (p && next.has(p)) next.delete(p);
                });
                return next;
              });
              if (pendingOnlyTargets.some((t) => t.path === selectedItem?.path)) {
                setSelectedItem(null);
              }
              // proceed with non-pending targets below
            }

            const actionableTargets = targets.filter((t) => !(t.isPending || t.pendingOnly));
            if (!actionableTargets.length) {
              setHintMsg('Removed pending items from view. (UI only)');
              return;
            }

            const fileTargets = actionableTargets.filter((t) => resolveType(t) === 'file');
            const folderTargets = actionableTargets.filter((t) => resolveType(t) === 'folder');

            const itemsForDialog = actionableTargets.map((t) => ({
              key: String(t.path || t.id || ''),
              primary: t.path || t.id || '(unknown)',
              secondary: resolveType(t) === 'folder' ? 'Folder (Cloudflare + DB)' : 'File (Cloudflare + DB)',
            }));

            confirmActionRef.current = async () => {
              await performDeleteTargets(actionableTargets);
            };

            setConfirmDialog({
              open: true,
              title: folderTargets.length ? 'Delete items?' : 'Delete files?',
              message: `This will permanently delete ${actionableTargets.length} item(s) from Cloudflare and the database.`,
              items: itemsForDialog,
              confirmLabel: 'Delete',
              cancelLabel: 'Cancel',
              confirmColor: 'error',
            });
            return;
          }


          case MENU_ACTION.GO_TO_UPLOAD_TABLE: {
            setHintMsg('Please use the table below to upload pending items.');
            return;
          }

          default: {
            setHintMsg('Not implemented yet.');
          }
        }
      } catch (err) {
        setHintMsg(err?.message || 'Action failed.');
      }
    },
    [
      closeCtx,
      ctx?.item,
      navigateToPath,
      refetchNow,
      selectedItem?.path,
      currentPath,
      openPreviewDialog,
      openPreviewInNewTab,
      startRename,
      setHiddenPendingPrefixes,
      setSelectedKeys,
      onOpenLocalFilesPicker,
      onOpenLocalFolderPicker,
      getSiblingNames,
      setServerItems,
      setTempNewFolderPath,
      setConfirmDialog,
      performDeleteTargets,
      resolveType,
    ]
  );

  // --- Submenu open/close helpers ---
  const openSubMenu = useCallback(
    (e, parentEntry) => {
      clearTimers();
      setSubCtx({
        anchorEl: e.currentTarget,
        items: parentEntry.children || [],
        parentKey: parentEntry.key,
      });
    },
    [clearTimers]
  );

  const scheduleCloseSub = useCallback(() => {
    clearTimers();
    closeTimersRef.current.sub = window.setTimeout(() => {
      setSubCtx(null);
    }, 180);
  }, [clearTimers]);

  const renderMenuEntries = (entries, { isSub = false } = {}) => {
    return entries.map((entry) => {
      if (entry.divider) {
        return <Divider key={entry.key} component="li" />;
      }

      const disabled = Boolean(entry.disabled);
      const danger = Boolean(entry.danger);
      const hasChildren = Array.isArray(entry.children) && entry.children.length > 0;

      const icon = entry.iconKey ? iconByKey[entry.iconKey] : null;

      return (
        <MenuItem
          key={entry.key}
          disabled={disabled}
          onClick={!hasChildren ? () => runAction(entry) : undefined}
          onMouseEnter={hasChildren ? (e) => openSubMenu(e, entry) : undefined}
          onMouseLeave={hasChildren ? scheduleCloseSub : undefined}
          sx={{
            minWidth: isSub ? 240 : 260,
            ...(danger
              ? {
                color: 'error.main',
                '& .MuiListItemIcon-root': { color: 'error.main' },
              }
              : null),
          }}
        >
          <ListItemIcon sx={{ minWidth: 34 }}>{icon || <span />}</ListItemIcon>

          <ListItemText
            primary={entry.label || ''}
            secondary={entry.hint || ''}
            primaryTypographyProps={{ fontSize: 13 }}
            secondaryTypographyProps={{ fontSize: 11 }}
          />

          {entry.shortcut ? (
            <Typography variant="caption" color="text.secondary" sx={{ ml: 2 }}>
              {entry.shortcut}
            </Typography>
          ) : null}

          {hasChildren ? <ChevronRightIcon fontSize="small" sx={{ ml: 1, opacity: 0.7 }} /> : null}
        </MenuItem>
      );
    });
  };

  return (
    <Paper
      variant="outlined"
      tabIndex={0}
      sx={{
        height: EXPLORER_HEIGHT_PX,
        maxHeight: EXPLORER_HEIGHT_PX,
        minHeight: EXPLORER_HEIGHT_PX,

        bgcolor: 'background.paper',
        color: 'text.primary',
        display: 'flex',
        flexDirection: 'column',

        overflow: 'hidden',
        position: 'relative',
        outline: 'none',
      }}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onContextMenu={(e) => openCtx(e, null)}
      onKeyDown={async (e) => {
        if (e.key === 'F2' && selectedItem) {
          e.preventDefault();
          startRename(selectedItem);
          return;
        }

        if (e.key !== 'Delete' || !selectedItem) return;

        e.preventDefault();

        try {
          await runAction({
            action: MENU_ACTION.DELETE,
            payload: {
              type: selectedItem.type === 'folder' ? 'folder' : 'file',
              path: String(selectedItem.path || ''),
              id: String(selectedItem.id || ''),
            },
          });
        } catch (err) {
          setHintMsg(err?.message || 'Delete failed.');
        }
      }}
    >
      <Fade in={isDragActive}>
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            bgcolor: 'rgba(25, 118, 210, 0.9)',
            zIndex: 999,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            pointerEvents: 'none',
          }}
        >
          <CloudUploadIcon sx={{ fontSize: 80, mb: 2 }} />
          <Typography variant="h4" fontWeight="bold">
            Drop to Upload
          </Typography>
          <Typography variant="h6" sx={{ mt: 1, opacity: 0.9 }}>
            Target: {currentPath === '' ? 'Cloudflare Root' : currentPath}
          </Typography>
        </Box>
      </Fade>

      <Box
        sx={{
          p: 1.5,
          borderBottom: 1,
          borderColor: 'divider',
          display: 'flex',
          gap: 1,
          alignItems: 'center',
          bgcolor: 'background.default',
          flex: '0 0 auto',
        }}
      >
        <IconButton size="small" onClick={handleGoUp} disabled={currentPath === ''}>
          <ArrowUpwardIcon fontSize="small" />
        </IconButton>

        <Paper
          variant="outlined"
          sx={{
            flex: 1,
            px: 1.5,
            py: 0.5,
            display: 'flex',
            alignItems: 'center',
            height: 40,
            borderColor: 'divider',
            bgcolor: 'background.paper',
          }}
        >
          <CloudQueueIcon fontSize="small" sx={{ mr: 1, color: '#F48120' }} />
          <Breadcrumbs separator={<NavigateNextIcon fontSize="small" />} aria-label="breadcrumb">
            <Link
              underline="hover"
              color="inherit"
              onClick={() => handleBreadcrumbClick(-1)}
              sx={{ cursor: 'pointer', fontWeight: currentPath === '' ? 'bold' : 'normal' }}
            >
              Cloudflare Root
            </Link>
            {currentPath
              .split('/')
              .filter(Boolean)
              .map((segment, index, arr) => (
                <Link
                  key={`${segment}-${index}`}
                  underline="hover"
                  color="inherit"
                  onClick={() => handleBreadcrumbClick(index)}
                  sx={{
                    cursor: 'pointer',
                    fontWeight: index === arr.length - 1 ? 'bold' : 'normal',
                  }}
                >
                  {segment}
                </Link>
              ))}
          </Breadcrumbs>
        </Paper>
      </Box>

      {fallbackMsg && (
        <Box sx={{ px: 2, pt: 1, flex: '0 0 auto' }}>
          <Alert severity="warning">{fallbackMsg}</Alert>
        </Box>
      )}

      {hintMsg && (
        <Box sx={{ px: 2, pt: 1, flex: '0 0 auto' }}>
          <Alert severity="info" onClose={() => setHintMsg(null)}>
            {hintMsg}
          </Alert>
        </Box>
      )}

      <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden', minHeight: 0 }}>
        <Box
          sx={{
            width: 180,
            borderRight: 1,
            borderColor: 'divider',
            p: 2,
            display: { xs: 'none', sm: 'block' },
            flex: '0 0 auto',
          }}
        >
          <Stack spacing={1}>
            <Typography variant="caption" color="text.secondary" fontWeight="bold">
              LOCATIONS
            </Typography>

            <Box
              sx={{
                display: 'flex',
                gap: 1,
                alignItems: 'center',
                cursor: 'pointer',
                color: currentPath === '' ? 'primary.main' : 'inherit',
                bgcolor: currentPath === '' ? 'action.hover' : 'transparent',
                p: 0.5,
                borderRadius: 1,
                ml: -0.5,
              }}
              onClick={() => {
                setCurrentPath('');
                setSelectedItem(null);
                onFolderSelect?.('');
              }}
              onContextMenu={(e) => openCtx(e, { id: 'root', path: '', name: 'Cloudflare Root', type: 'root' })}
            >
              <DnsIcon fontSize="small" sx={{ color: '#F48120' }} />
              <Typography variant="body2" fontWeight={500}>
                Cloudflare
              </Typography>
            </Box>
          </Stack>
        </Box>

        <Box
          ref={itemsContainerRef}
          sx={{
            flex: 1,
            p: 2,
            minWidth: 0,
            minHeight: 0,
            overflowY: 'auto',
            overflowX: 'hidden',
            bgcolor: 'background.paper',
            overscrollBehavior: 'contain',
            position: 'relative',
          }}
          onMouseDown={handleBandMouseDown}
          onClick={() => {
            if (suppressClearClickRef.current) {
              suppressClearClickRef.current = false;
              return;
            }
            clearSelection();
            setSelectedItem(null);
          }}
        >
          {loading ? (
            <Stack direction="row" spacing={2}>
              <Skeleton width={80} height={80} />
              <Skeleton width={80} height={80} />
            </Stack>
          ) : (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignContent: 'flex-start' }}>
              {currentItems.length === 0 && (
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ width: '100%', textAlign: 'center', mt: 4 }}
                >
                  This folder is empty. Drag files here to upload.
                </Typography>
              )}

              {sortItems(currentItems).map((item) => {
                const itemKey = String(item?.path || item?.id || '');
                const isSelected = selectedKeys.has(itemKey) || selectedItem?.path === item.path;
                const isRenaming = renamingPath === item.path;

                return (
                  <Box
                    key={itemKey || item.path}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleItemClick(item, e);
                    }}
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      handleItemDoubleClick(item);
                    }}
                    onContextMenu={(e) => openCtx(e, item)}
                    ref={(el) => {
                      if (!itemKey) return;
                      if (el) itemRefs.current.set(itemKey, el);
                      else itemRefs.current.delete(itemKey);
                    }}
                    sx={{
                      width: 100,
                      height: 110,
                      p: 1,
                      borderRadius: 1,
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      bgcolor: isSelected ? 'rgba(25, 118, 210, 0.1)' : 'transparent',
                      border: isSelected ? '1px solid rgba(25, 118, 210, 0.3)' : '1px solid transparent',
                      '&:hover': {
                        bgcolor: isSelected ? 'rgba(25, 118, 210, 0.15)' : 'rgba(0, 0, 0, 0.04)',
                      },
                    }}
                  >
                    {item.isPending ? (
                      <Badge
                        overlap="circular"
                        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
                        badgeContent={
                          <AutoModeIcon
                            sx={{
                              fontSize: 16,
                              color: '#fff',
                              bgcolor: '#2196f3',
                              borderRadius: '50%',
                              p: 0.2,
                            }}
                          />
                        }
                      >
                        {getIcon(item.type, item.name, false, true)}
                      </Badge>
                    ) : (
                      getIcon(item.type, item.name, false)
                    )}

                    {isRenaming ? (
                      <TextField
                        inputRef={renameInputRef}
                        value={renameValue}
                        size="small"
                        disabled={renamingBusy}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onBlur={commitRename}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            commitRename();
                          } else if (e.key === 'Escape') {
                            e.preventDefault();
                            cancelRename();
                          }
                        }}
                        sx={{ mt: 0.5, width: '100%' }}
                        inputProps={{ style: { textAlign: 'center', fontSize: '0.75rem' } }}
                      />
                    ) : (
                      <Typography
                        variant="caption"
                        align="center"
                        sx={{
                          mt: 0.5,
                          lineHeight: 1.2,
                          width: '100%',
                          display: '-webkit-box',
                          overflow: 'hidden',
                          WebkitBoxOrient: 'vertical',
                          WebkitLineClamp: 2,
                          color: item.isPending ? 'primary.main' : 'text.primary',
                          fontWeight: item.isPending ? 600 : 400,
                        }}
                      >
                        {item.name}
                      </Typography>
                    )}
                  </Box>
                );
              })}
            </Box>
          )}

          {isSelecting && (
            <Box
              sx={{
                position: 'absolute',
                left: selectionBox.x,
                top: selectionBox.y,
                width: selectionBox.width,
                height: selectionBox.height,
                pointerEvents: 'none',
                zIndex: 10,
                border: '1px solid rgba(25,118,210,0.7)',
                background: 'rgba(25,118,210,0.15)',
                boxShadow: '0 0 0 1px rgba(25,118,210,0.2)',
              }}
            />
          )}
        </Box>

        <Box
          sx={{
            width: 220,
            borderLeft: 1,
            borderColor: 'divider',
            p: 2,
            display: { xs: 'none', md: 'block' },
            textAlign: 'center',
            bgcolor: 'background.default',
            flex: '0 0 auto',
          }}
        >
          {getIcon(displayItem.type, displayItem.name, true, displayItem.isPending)}

          <Typography variant="subtitle1" fontWeight="bold" sx={{ wordBreak: 'break-word', mt: 1 }}>
            {displayItem.name}
          </Typography>

          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
            {displayItem.isPending ? 'Pending Upload' : displayItem.type === 'root' ? 'Cloud Server' : 'File Folder'}
          </Typography>

          {displayItem.isPending && (
            <Stack direction="row" spacing={1} justifyContent="center" sx={{ mb: 2, flexWrap: 'wrap', gap: 0.5 }}>
              {displayItem.resolutionCategory && (
                <Chip
                  label={String(displayItem.resolutionCategory).toUpperCase()}
                  size="small"
                  color={displayItem.resolutionCategory === 'high' ? 'error' : 'primary'}
                  variant="outlined"
                  icon={<StraightenIcon />}
                />
              )}
              {displayItem.sizeBytes != null && (
                <Chip label={formatBytes(displayItem.sizeBytes)} size="small" variant="outlined" icon={<DataUsageIcon />} />
              )}
            </Stack>
          )}

          <Divider sx={{ my: 2 }} />

          <Stack spacing={1} alignItems="start">
            <Typography variant="caption" color="text.secondary" fontWeight="bold">
              Cloudflare Path:
            </Typography>
            <Paper
              variant="outlined"
              sx={{
                width: '100%',
                p: 1.5,
                bgcolor: 'background.paper',
                fontFamily: 'monospace',
                fontSize: '0.75rem',
                wordBreak: 'break-all',
                textAlign: 'left',
                borderLeft: '4px solid #F48120',
              }}
            >
              {displayItem.path === 'Root' ? '/' : displayItem.path}
            </Paper>
          </Stack>
        </Box>
      </Box>
 
      <PreviewDialog
        open={previewOpen}
        previewTitle={previewTitle}
        previewBusy={previewBusy}
        previewUrl={previewUrl}
        previewMime=""
        closePreview={() => setPreviewOpen(false)}
      />

      <ConfirmDialog
        open={confirmDialog.open}
        title={confirmDialog.title || 'Are you sure?'}
        message={confirmDialog.message}
        items={confirmDialog.items}
        confirmLabel={confirmDialog.confirmLabel || 'Confirm'}
        cancelLabel={confirmDialog.cancelLabel || 'Cancel'}
        confirmColor={confirmDialog.confirmColor || 'error'}
        loading={confirmBusy}
        onCancel={closeConfirmDialog}
        onConfirm={confirmAndRun}
      />

      <Box
        sx={{
          p: 0.5,
          px: 2,
          bgcolor: 'background.default',
          borderTop: 1,
          borderColor: 'divider',
          color: 'text.secondary',
          fontSize: '0.75rem',
          flex: '0 0 auto',
        }}
      >
        {currentItems.length} items
      </Box>

      {/* Main context menu */}
      <Menu
        open={Boolean(ctx)}
        onClose={closeCtx}
        anchorReference="anchorPosition"
        anchorPosition={ctx ? { top: ctx.mouseY, left: ctx.mouseX } : undefined}
        MenuListProps={{
          dense: true,
          onMouseEnter: clearTimers,
          onContextMenu: (e) => {
            e.preventDefault();
            e.stopPropagation();
          },
        }}
      >
        {renderMenuEntries(menuModel)}
      </Menu>

      {/* Submenu as Popper */}
      <Popper
        open={Boolean(subCtx)}
        anchorEl={subCtx?.anchorEl || null}
        placement="right-start"
        style={{ zIndex: 1600 }}
        modifiers={[{ name: 'offset', options: { offset: [0, -8] } }]}
      >
        <Paper variant="outlined" onMouseEnter={clearTimers} onMouseLeave={scheduleCloseSub} sx={{ mt: 0.5 }}>
          <MenuList
            dense
            onContextMenu={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          >
            {renderMenuEntries(subCtx?.items || [], { isSub: true })}
          </MenuList>
        </Paper>
      </Popper>
    </Paper>
  );
}
