// src/cloudflare/components/CloudflareFolderUploadConfigurator.jsx
'use client';

import React, { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Container,
  Paper,
  Stack,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  CircularProgress,
  IconButton,
  Tooltip,
  Divider,
} from '@mui/material';
import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { DataGrid } from '@mui/x-data-grid';
import CloudIcon from '@mui/icons-material/Cloud';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import ImageIcon from '@mui/icons-material/Image';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import VisibilityIcon from '@mui/icons-material/Visibility';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import { formatBytes } from '../../cloudflare/utils/format';
import { getFilesFromDataTransfer } from '../../cloudflare/utils/files';
import {
  IMAGE_PROFILES,
  DEFAULT_CUSTOM,
  profileToTransform,
} from '../../cloudflare/utils/profiles';
import {
  commitUploadMetadataToDb,
  createUploadIntentsWithConfig,
  uploadDirectToCloudflare,
} from '../api/image.service';
import { applyServerAssetProfiles } from '../api/assets.service';
import { normPath, dirname } from '../../cloudflare/utils/pathMime';
import { fsItemsToCatalogItems, toMetaRows } from '../../cloudflare/utils/serverCatalog';
import { isLikelyImageFile } from '../../cloudflare/utils/isLikelyImageFile';
import { fetchFsItemsDeepSmart } from '../../cloudflare/utils/fetchFsItemsDeepSmart';
import CloudflareFolderSelector from './CloudflareFolderSelector';
import { catalogFilesWithDimensions } from '../utils/imageDimensions';
import SourceChooserDialog from './upload-configurator/dialogs/SourceChooserDialog';
import LocalPickerDialog from './upload-configurator/dialogs/LocalPickerDialog';
import GoogleDriveDialog from './upload-configurator/dialogs/GoogleDriveDialog';
import MergeReplaceDialog from './upload-configurator/dialogs/MergeReplaceDialog';
import PreviewDialog from './upload-configurator/dialogs/PreviewDialog';

// ✅ reuse predefined API to get server FS list
import { fetchCloudflareFs } from '../api/fs.service';

const STORAGE_PREF_KEY = 'CF_UPLOAD_MERGE_PREFERENCE';
const UI_MODE_KEY = 'CF_UI_MODE';

// Soft guidance limit (warning only)
const SOFT_LIMIT_FILES = 1200;

// Upload pacing (optional): tiny pauses to reduce burst pressure
const UPLOAD_PAUSE_EVERY = 25;
const UPLOAD_PAUSE_MS = 250;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function formatDuration(ms) {
  const totalSec = Math.max(0, Math.floor((ms || 0) / 1000));
  const hh = String(Math.floor(totalSec / 3600)).padStart(2, '0');
  const mm = String(Math.floor((totalSec % 3600) / 60)).padStart(2, '0');
  const ss = String(totalSec % 60).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}

function computeEtaMs(startAt, done, total) {
  if (!startAt || !done || done <= 0) return null;
  const elapsed = Date.now() - startAt;
  const avg = elapsed / done;
  const remain = Math.max(0, total - done);
  return Math.round(avg * remain);
}

// Keep same semantics as server "previous style" (for preflight duplicate detection only)
function joinPath(a, b) {
  const left = String(a || '').replace(/^\/+|\/+$/g, '');
  const right = String(b || '').replace(/^\/+|\/+$/g, '');
  if (!left) return right;
  if (!right) return left;
  return `${left}/${right}`.replace(/\/{2,}/g, '/');
}

function computeRelPathFromRow(f) {
  const rootSlug = String(f?.rootSlug || '').trim();
  const relativePath = String(f?.relativePath || '').trim();
  const fileName = String(f?.fileName || f?.name || '').trim();

  if (rootSlug) {
    if (relativePath) return joinPath(rootSlug, relativePath);
    if (fileName) return joinPath(rootSlug, fileName);
  }

  return relativePath || fileName || '';
}

function isConflictErr(e) {
  const code = Number(e?.code ?? NaN);
  const status = Number(e?.status ?? NaN);
  return status === 409 || code === 5409;
}

export default function CloudflareFolderUploadConfigurator() {
  // ✅ Theme
  const [mode, setMode] = useState('dark');
  const [fsRefreshKey, setFsRefreshKey] = useState(0);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(UI_MODE_KEY);
      if (saved === 'light' || saved === 'dark') setMode(saved);
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(UI_MODE_KEY, mode);
    } catch {}
  }, [mode]);

  const theme = useMemo(() => createTheme({ palette: { mode } }), [mode]);
  const toggleMode = () => setMode((m) => (m === 'dark' ? 'light' : 'dark'));

  // Queue
  const [baseRows, setBaseRows] = useState([]);
  const filesRef = useRef(new Map());

  // Notice now carries severity + text
  const [notice, setNotice] = useState(null); // { severity, text }
  const setNoticeMsg = useCallback((text, severity = 'info') => {
    if (!text) {
      setNotice(null);
      return;
    }
    setNotice({ severity, text: String(text) });
  }, []);

  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [intents, setIntents] = useState(null);

  // local vs server
  const [queueSource, setQueueSource] = useState('local');
  const gridPaperRef = useRef(null);

  // Preflight warnings (persistent during a run)
  const [preflightWarning, setPreflightWarning] = useState(null);

  // Selection (DataGrid v8 style in your project)
  const [rowSelectionModel, setRowSelectionModel] = useState(() => ({
    type: 'include',
    ids: new Set(),
  }));

  // Pagination
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 20 });

  const [targetCloudflareFolder, setTargetCloudflareFolder] = useState('');

  // merge/replace dialog
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingItems, setPendingItems] = useState([]);
  const [dontAskAgain, setDontAskAgain] = useState(false);

  // profiles
  const [defaultProfile, setDefaultProfile] = useState('web');
  const [defaultCustom, setDefaultCustom] = useState(DEFAULT_CUSTOM);
  const [profileDeltaById, setProfileDeltaById] = useState({});
  const [customDeltaById, setCustomDeltaById] = useState({});

  // source dialogs
  const [sourceDialogOpen, setSourceDialogOpen] = useState(false);
  const [localDialogOpen, setLocalDialogOpen] = useState(false);
  const [driveDialogOpen, setDriveDialogOpen] = useState(false);
  const [googleDriveUrl, setGoogleDriveUrl] = useState('');

  // hidden inputs
  const localFilesInputRef = useRef(null);
  const localFolderInputRef = useRef(null);

  // Preview dialog
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewTitle, setPreviewTitle] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');
  const [previewMime, setPreviewMime] = useState('');
  const [previewBusy, setPreviewBusy] = useState(false);
  const previewObjectUrlRef = useRef(null);

  const gridRows = useMemo(() => {
    return baseRows.map((row) => {
      const currentProfile = profileDeltaById[row.id] || defaultProfile;
      const currentCustom = customDeltaById[row.id] || defaultCustom;
      return { ...row, _profile: currentProfile, _custom: currentCustom };
    });
  }, [baseRows, profileDeltaById, customDeltaById, defaultProfile, defaultCustom]);

  const pageCount = useMemo(() => {
    const total = gridRows.length;
    const size = paginationModel.pageSize || 20;
    return Math.max(1, Math.ceil(total / size));
  }, [gridRows.length, paginationModel.pageSize]);

  // Clamp page index safely (avoid setState during render)
  useEffect(() => {
    if (paginationModel.page > pageCount - 1) {
      setPaginationModel((m) => ({ ...m, page: Math.max(0, pageCount - 1) }));
    }
  }, [paginationModel.page, pageCount]);

  const allRowIds = useMemo(() => gridRows.map((r) => r.id), [gridRows]);

  const selectionCount = useMemo(() => {
    const m = rowSelectionModel;
    if (!m?.ids) return 0;
    return m.type === 'include' ? m.ids.size : Math.max(0, allRowIds.length - m.ids.size);
  }, [rowSelectionModel, allRowIds.length]);

  const selectedIds = useMemo(() => {
    const m = rowSelectionModel;
    if (!m?.ids) return [];
    if (m.type === 'include') return Array.from(m.ids);
    return allRowIds.filter((id) => !m.ids.has(id));
  }, [rowSelectionModel, allRowIds]);

  const totalSizeBytes = useMemo(
    () => baseRows.reduce((s, r) => s + (Number(r.sizeBytes) || 0), 0),
    [baseRows]
  );

  const resolutionStats = useMemo(() => {
    const s = { high: 0, web: 0, low: 0 };
    for (const r of baseRows) {
      if (s[r.resolutionCategory] !== undefined) s[r.resolutionCategory] += 1;
    }
    return s;
  }, [baseRows]);

  const bulkProfileValue = useMemo(() => {
    if (!selectedIds.length) return '';
    const selectedProfiles = new Set(selectedIds.map((id) => profileDeltaById[id] || defaultProfile));
    if (selectedProfiles.size === 1) return [...selectedProfiles][0];
    return '__mixed__';
  }, [selectedIds, profileDeltaById, defaultProfile]);

  const performReplace = (items) => {
    setQueueSource('local');
    setRowSelectionModel({ type: 'include', ids: new Set() });
    setPaginationModel((m) => ({ ...m, page: 0 }));
    filesRef.current = new Map(items.map((i) => [i.id, i.file]));
    setBaseRows(toMetaRows(items));
    setProfileDeltaById({});
    setCustomDeltaById({});
    setNotice(null);
    setPreflightWarning(null);
    setConfirmOpen(false);
    setPendingItems([]);
    setIntents(null);
  };

  const performMerge = (items) => {
    setQueueSource('local');
    items.forEach((item) => filesRef.current.set(item.id, item.file));
    const newMeta = toMetaRows(items);
    setBaseRows((prev) => {
      const existingIds = new Set(prev.map((r) => r.id));
      const uniqueNew = newMeta.filter((r) => !existingIds.has(r.id));
      return [...prev, ...uniqueNew];
    });
    setNoticeMsg(`Added ${items.length} new files.`, 'info');
    setPreflightWarning(null);
    setConfirmOpen(false);
    setPendingItems([]);
    setIntents(null);
  };

  const performReplaceMetaRows = (metaRows, { source = 'server', clearFiles = true } = {}) => {
    setQueueSource(source);
    setRowSelectionModel({ type: 'include', ids: new Set() });
    setPaginationModel((m) => ({ ...m, page: 0 }));
    if (clearFiles) filesRef.current = new Map();
    setBaseRows(Array.isArray(metaRows) ? metaRows : []);
    setProfileDeltaById({});
    setCustomDeltaById({});
    setNotice(null);
    setPreflightWarning(null);
    setConfirmOpen(false);
    setPendingItems([]);
    setIntents(null);
  };

  /**
   * -----------------------------------------
   * SERVER: hydrate into editable table (deep)
   * -----------------------------------------
   */
  const hydrateQueueFromServer = useCallback(
    async ({ path, paths, selection, kind, currentPath }) => {
      const normalizedSingle = normPath(String(path || currentPath || ''));
      const selectionEntries =
        Array.isArray(selection) && selection.length
          ? selection.map((s) => ({
              path: normPath(String(s?.path || '')),
              type: String(s?.type || s?.kind || ''),
            }))
          : [];

      const pathList =
        selectionEntries.length > 0
          ? selectionEntries
          : Array.isArray(paths) && paths.length
            ? paths.map((p) => ({ path: normPath(String(p || '')), type: '' }))
            : normalizedSingle
              ? [{ path: normalizedSingle, type: String(kind || '') }]
              : [];

      const multi = pathList.length > 1;
      setLoading(true);
      setNotice(null);
      setPreflightWarning(null);

      try {
        const collectedFiles = [];

        const loadFolder = async (folderPath) => {
          if (!folderPath) {
            const res = await fetchCloudflareFs('');
            if (!res?.ok || !Array.isArray(res.items)) {
              throw new Error(res?.message || 'Failed to load server items.');
            }
            return res.items;
          }
          return await fetchFsItemsDeepSmart(folderPath, fetchCloudflareFs);
        };

        for (const entry of pathList) {
          const p = entry.path;
          const t = String(entry.type || '').toLowerCase();
          const isFile =
            t === 'file' ||
            (!t && p && /\.[a-z0-9]{1,6}$/i.test(p) && !p.endsWith('/'));

          if (isFile) {
            const parent = dirname(p);
            const items = await loadFolder(parent);
            const match = items.filter(
              (it) => String(it?.type) === 'file' && normPath(it?.path) === p
            );
            collectedFiles.push(...match);
          } else {
            const items = await loadFolder(p);
            const filesInFolder = items.filter((it) => String(it?.type) === 'file');
            collectedFiles.push(...filesInFolder);
          }
        }

        // single fallback when no paths provided
        if (!pathList.length) {
          const scopeFolder =
            String(kind || '').toLowerCase() === 'file'
              ? dirname(normalizedSingle)
              : normalizedSingle;
          const items = scopeFolder
            ? await loadFolder(scopeFolder)
            : (await fetchCloudflareFs(''))?.items || [];

          const files =
            String(kind || '').toLowerCase() === 'file'
              ? items.filter(
                  (it) => String(it?.type) === 'file' && normPath(it?.path) === normalizedSingle
                )
              : items.filter((it) => String(it?.type) === 'file');
          collectedFiles.push(...files);
        }

        // de-dupe by path
        const seen = new Set();
        const uniqueFiles = [];
        for (const f of collectedFiles) {
          const key = normPath(f?.path);
          if (!key || seen.has(key)) continue;
          seen.add(key);
          uniqueFiles.push(f);
        }

        if (!uniqueFiles.length) {
          performReplaceMetaRows([], { source: 'server', clearFiles: true });
          setNoticeMsg('No files found for this selection.', 'info');
          return;
        }

        const metaRows = toMetaRows(fsItemsToCatalogItems(uniqueFiles));
        performReplaceMetaRows(metaRows, { source: 'server', clearFiles: true });
        setNoticeMsg(
          `Loaded ${metaRows.length} server file(s) from ${pathList.length || 1} selection(s) into the editable table.`,
          'success'
        );

        if (gridPaperRef.current?.scrollIntoView) {
          gridPaperRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      } catch (err) {
        setNoticeMsg(err?.message || 'Failed to load server files into table.', 'error');
      } finally {
        setLoading(false);
      }
    },
    [setNoticeMsg, performReplaceMetaRows]
  );

  // ✅ Listen to explorer context menu action "cf:show-table"
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const onShow = (e) => {
      const detail = e?.detail || {};
      hydrateQueueFromServer(detail);
    };

    window.addEventListener('cf:show-table', onShow);
    return () => window.removeEventListener('cf:show-table', onShow);
  }, [hydrateQueueFromServer]);

  /**
   * -----------------------------------------
   * LOCAL: drag / pick -> catalog dims -> merge
   * -----------------------------------------
   */
  const processAndPrompt = useCallback(
    (filesArray) => {
      setQueueSource('local');
      setLoading(true);
      setPreflightWarning(null);

      setTimeout(() => {
        (async () => {
          const items = await catalogFilesWithDimensions(filesArray || []);

          if (!items.length) {
            setNoticeMsg('No image files found.', 'info');
            setLoading(false);
            return;
          }

          if (baseRows.length === 0) {
            performReplace(items);
            setLoading(false);
            return;
          }

          const savedPref = localStorage.getItem(STORAGE_PREF_KEY);
          if (savedPref === 'MERGE') performMerge(items);
          else if (savedPref === 'REPLACE') performReplace(items);
          else {
            setPendingItems(items);
            setDontAskAgain(false);
            setConfirmOpen(true);
          }

          setLoading(false);
        })().catch((err) => {
          console.error('[cf][dims] failed', err);
          setNoticeMsg(err?.message || 'Failed to read image dimensions.', 'error');
          setLoading(false);
        });
      }, 50);
    },
    [baseRows.length, performMerge, performReplace, setNoticeMsg]
  );

  const handleClearAll = () => {
    setBaseRows([]);
    filesRef.current = new Map();
    setRowSelectionModel({ type: 'include', ids: new Set() });
    setPaginationModel((m) => ({ ...m, page: 0 }));
    setNotice(null);
    setPreflightWarning(null);
    setIntents(null);
    setQueueSource('local');
  };

  const handleUserReplace = () => {
    if (dontAskAgain) localStorage.setItem(STORAGE_PREF_KEY, 'REPLACE');
    performReplace(pendingItems);
  };

  const handleUserMerge = () => {
    if (dontAskAgain) localStorage.setItem(STORAGE_PREF_KEY, 'MERGE');
    performMerge(pendingItems);
  };

  const clearPreference = () => {
    localStorage.removeItem(STORAGE_PREF_KEY);
    setNoticeMsg('Preference cleared. You will be asked next time.', 'info');
  };

  const handleDialogClose = () => {
    setConfirmOpen(false);
    setPendingItems([]);
  };

  const handleFilesDrop = useCallback(
    async (dataTransfer, targetPath) => {
      setQueueSource('local');
      setTargetCloudflareFolder(targetPath);
      const filesArray = await getFilesFromDataTransfer(dataTransfer);
      processAndPrompt(filesArray);
    },
    [processAndPrompt]
  );

  /**
   * ---------------------------
   * Profiles / custom handlers
   * ---------------------------
   */
  const handleProfileChange = useCallback((id, newValue) => {
    setProfileDeltaById((m) => ({ ...m, [id]: newValue }));
    if (newValue !== 'custom') {
      setCustomDeltaById((m) => {
        if (!m[id]) return m;
        const { [id]: _, ...rest } = m;
        return rest;
      });
    }
  }, []);

  const handleCustomChange = useCallback((id, field, value) => {
    setCustomDeltaById((m) => ({
      ...m,
      [id]: { ...(m[id] || DEFAULT_CUSTOM), [field]: value ?? null },
    }));
    setProfileDeltaById((m) => ({ ...m, [id]: 'custom' }));
  }, []);

  const handleBulkProfileChange = (newValue) => {
    if (!selectedIds.length) return;
    if (!newValue || newValue === '__mixed__') return;

    setProfileDeltaById((prev) => {
      const next = { ...prev };
      selectedIds.forEach((id) => {
        if (newValue === defaultProfile) delete next[id];
        else next[id] = newValue;
      });
      return next;
    });

    if (newValue !== 'custom') {
      setCustomDeltaById((prev) => {
        const next = { ...prev };
        selectedIds.forEach((id) => delete next[id]);
        return next;
      });
    }
  };

  /**
   * -----------------------------------------
   * LOCAL: upload flow
   * -----------------------------------------
   */
  const requestUploadIntents = useCallback(
    async (mode = 'override') => {
      if (!baseRows.length) return;

      if (queueSource !== 'local') {
        setNoticeMsg(
          'This table is loaded from server (DB/FS). Use “Save Profiles” (Apply) instead of Upload.',
          'warning'
        );
        return;
      }

      const normalizedMode = mode === 'copy' ? 'copy' : 'override';
      const normalizedTarget = normPath(targetCloudflareFolder);

      setCreating(true);
      setNotice(null);
      setIntents(null);
      setPreflightWarning(null);

      try {
        const selectedSet = new Set(selectedIds);
        const listToProcess = selectionCount
          ? gridRows.filter((r) => selectedSet.has(r.id))
          : gridRows;

        const totalFiles = listToProcess.length;
        const BATCH_SIZE = 2;

        if (!totalFiles) {
          setNoticeMsg('Nothing to upload.', 'info');
          return;
        }
        
        // Soft limit warning
        if (totalFiles > SOFT_LIMIT_FILES) {
          setPreflightWarning(
            `Large upload detected: ${totalFiles} files (recommended ≤ ${SOFT_LIMIT_FILES}). ` +
              `This can take a long time depending on your network + Cloudflare/DB speed. ETA will stabilize after a few uploads.`
          );
        }

        // Preflight: detect duplicate destination paths (danger for override)
        {
          const destCount = new Map();
          const examples = [];
          for (const r of listToProcess) {
            const rel = computeRelPathFromRow(r);
            const dest = joinPath(normalizedTarget, rel);
            const n = (destCount.get(dest) || 0) + 1;
            destCount.set(dest, n);
            if (n === 2 && examples.length < 5) examples.push(dest);
          }
          const duplicates = Array.from(destCount.values()).filter((n) => n > 1).length;
          if (duplicates > 0) {
            const extra =
              examples.length > 0
                ? ` Examples: ${examples.map((x) => `/${x}`).join(', ')}${
                    duplicates > examples.length ? ', …' : ''
                  }`
                : '';
            setPreflightWarning(
              `⚠️ Detected ${duplicates} duplicate destination path(s).` +
                (normalizedMode === 'override'
                  ? ` In override mode, later duplicates may replace earlier ones at the same path.`
                  : ` In copy mode, Cloudflare IDs may be suffixed to avoid collisions.`) +
                extra
            );
          }
        }

        // Precompute transforms map
        const transformMap = {};
        for (const r of listToProcess) {
          transformMap[r.id] = profileToTransform(r._profile, r._custom);
        }

        // Create intents in small batches and upload them immediately.
        // This avoids expiring early direct-upload URLs during large runs.
        const intentsStartAt = Date.now();
        const uploadStartAt = Date.now();
        const rowById = new Map(listToProcess.map((r) => [r.id, r]));

        let lastTargetUsed = normalizedTarget;
        let createdIntentsCount = 0;
        let uploadedCount = 0;

        const modeLabel = normalizedMode === 'copy' ? 'copy (new folder)' : 'override';

        for (let i = 0; i < totalFiles; i += BATCH_SIZE) {
          const batch = listToProcess.slice(i, i + BATCH_SIZE);
          const transformsBatch = {};
          for (const r of batch) transformsBatch[r.id] = transformMap[r.id];

          const res = await createUploadIntentsWithConfig({
            files: batch,
            transforms: transformsBatch,
            defaultProfile,
            targetFolder: normalizedTarget,
            mode: normalizedMode,
          });

          if (!res?.ok || !Array.isArray(res.intents)) {
            throw new Error(res?.message || 'Failed to create upload intents.');
          }

          lastTargetUsed = res?.targetFolder ?? lastTargetUsed;
          createdIntentsCount += res.intents.length;

          setIntents({
            ok: true,
            count: createdIntentsCount,
            targetFolder: lastTargetUsed,
            mode: normalizedMode,
          });

          const createdCount = Math.min(i + batch.length, totalFiles);
          const createdPct = Math.round((createdCount / totalFiles) * 100);
          const createdEtaMs = computeEtaMs(intentsStartAt, createdCount, totalFiles);

          setNoticeMsg(
            `Creating upload URLs... ${createdCount}/${totalFiles} (${createdPct}%) [pass 1/3] • ETA ${
              createdEtaMs == null ? '—' : formatDuration(createdEtaMs)
            }`
          );
          console.log('[cf][upload][intents]', {
            batch: createdCount,
            total: totalFiles,
            pct: createdPct,
          });

          const targetLabel = lastTargetUsed ? `/${lastTargetUsed}` : '/';

          for (const intent of res.intents) {
            const row = rowById.get(intent.localId);
            if (!row) {
              throw new Error(`Missing row for intent.localId: ${intent.localId}`);
            }

            const fileObj = filesRef.current.get(intent.localId);
            if (!fileObj) {
              throw new Error(`Missing local file for intent.localId: ${intent.localId}`);
            }

            let cfId = intent.id;
            let uploadURL = intent.uploadURL;

            // Upload with conflict recovery:
            // A) try once
            // B) if 5409/409, wait then retry same URL (eventual consistency)
            // C) if still 5409/409, request fresh intent for this row, then upload again
            try {
              await uploadDirectToCloudflare({ uploadURL, file: fileObj });
            } catch (e) {
              if (!isConflictErr(e)) throw e;

              setNoticeMsg(
                `Conflict for "${row?.fileName || intent.localId}". Waiting and retrying... [pass 2/3]`,
                'warning'
              );

              await sleep(1500);

              try {
                await uploadDirectToCloudflare({ uploadURL, file: fileObj });
              } catch (e2) {
                if (!isConflictErr(e2)) throw e2;

                setNoticeMsg(
                  `Conflict persists for "${row?.fileName || intent.localId}". Requesting a fresh upload URL and retrying... [pass 2/3]`,
                  'warning'
                );

                const singleTransforms = { [row.id]: transformMap[row.id] };
                const refreshed = await createUploadIntentsWithConfig({
                  files: [row],
                  transforms: singleTransforms,
                  defaultProfile,
                  targetFolder: normalizedTarget,
                  mode: normalizedMode,
                });

                const newIntent = refreshed?.intents?.[0];
                if (!refreshed?.ok || !newIntent?.uploadURL || !newIntent?.id) {
                  throw new Error(
                    refreshed?.message || 'Failed to refresh upload intent after conflict.'
                  );
                }

                lastTargetUsed = refreshed?.targetFolder ?? lastTargetUsed;
                cfId = newIntent.id;
                uploadURL = newIntent.uploadURL;

                await uploadDirectToCloudflare({ uploadURL, file: fileObj });
              }
            }

            // commit metadata after successful upload (use FINAL cfId)
            await commitUploadMetadataToDb({
              cf_image_id: cfId,
              sizeBytes: Number(row?.sizeBytes ?? fileObj.size ?? 0) || 0,
              mimeType: String(row?.mimeType ?? fileObj.type ?? 'application/octet-stream'),
              width: Number(row?.width ?? 0) || 0,
              height: Number(row?.height ?? 0) || 0,
            });

            uploadedCount += 1;

            const pct = Math.round((uploadedCount / totalFiles) * 100);
            const etaMs = computeEtaMs(uploadStartAt, uploadedCount, totalFiles);

            setNoticeMsg(
              `Uploading ${uploadedCount}/${totalFiles} to Cloudflare ${targetLabel} [${modeLabel}] (${pct}%) [pass 2/3] • ETA ${
                etaMs == null ? '—' : formatDuration(etaMs)
              }`
            );

            console.log('[cf][upload][progress]', {
              uploadedCount,
              total: totalFiles,
              pct,
              target: targetLabel,
              mode: modeLabel,
            });

            if (UPLOAD_PAUSE_EVERY > 0 && uploadedCount % UPLOAD_PAUSE_EVERY === 0) {
              await sleep(UPLOAD_PAUSE_MS);
            }
          }
        }

        // 3) finalize
        setNoticeMsg(`✅ Upload complete. Refreshing Cloudflare folder view... [pass 3/3]`, 'success');
        setFsRefreshKey((k) => k + 1);
      } catch (err) {
        setNoticeMsg(err?.message || 'Upload failed.', 'error');
      } finally {
        setCreating(false);
      }
    },
    [
      baseRows.length,
      queueSource,
      selectionCount,
      selectedIds,
      gridRows,
      defaultProfile,
      targetCloudflareFolder,
      setNoticeMsg,
    ]
  );

  // Listen to explorer action "Upload copy here" AFTER upload handler exists
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const ensureCopyPath = (p) => {
      const clean = normPath(p);
      if (!clean) return 'root (copy)';
      if (clean.endsWith(' (copy)')) return clean;
      return `${clean} (copy)`;
    };

    const onUploadCopy = async (e) => {
      const detail = e?.detail || {};
      const srcPath = detail.path || '';
      const copyPath = ensureCopyPath(srcPath);

      setTargetCloudflareFolder(copyPath);
      setQueueSource('local');
      setNoticeMsg(`Copy upload: targeting "${copyPath}"`, 'info');

      await requestUploadIntents('copy');
    };

    window.addEventListener('cf:upload-copy', onUploadCopy);
    return () => window.removeEventListener('cf:upload-copy', onUploadCopy);
  }, [requestUploadIntents, setNoticeMsg]);

  /**
   * -----------------------------------------
   * SERVER: apply/save profiles + get openUrl
   * -----------------------------------------
   */

  
  const applyProfilesToServerAssets = useCallback(async () => {
    if (!baseRows.length) return;

    if (queueSource !== 'server') {
      setNoticeMsg('This action is for server-loaded rows. For local rows, use Upload.', 'warning');
      return;
    }

    setCreating(true);
    setNotice(null);
    setIntents(null);
    setPreflightWarning(null);

    try {
      const selectedSet = new Set(selectedIds);
      const listToProcess = selectionCount ? gridRows.filter((r) => selectedSet.has(r.id)) : gridRows;

      const items = listToProcess.map((r) => {
        // Build a transform even for preset profiles so height doesn't drop to null.
        const transform = profileToTransform(r._profile, r._custom);
        const rowWidth = Number(r.width ?? r.imageWidth ?? 0) || null;
        const rowHeight = Number(r.height ?? r.imageHeight ?? 0) || null;

        if (transform.height == null && rowHeight) transform.height = rowHeight;
        if (transform.width == null && rowWidth) transform.width = rowWidth;

        return {
          cf_image_id: r.id, // IMPORTANT: your row id == cf_image_id/path
          profile: r._profile,
          custom: transform,
        };
      });

      const res = await applyServerAssetProfiles({
        items,
        defaultProfile,
      });

      if (!res?.ok || !Array.isArray(res.updated)) {
        throw new Error(res?.message || 'Failed to apply profiles.');
      }

      const byId = new Map(res.updated.map((u) => [String(u.cf_image_id), u]));

      // Merge openUrl/thumbUrl into base rows for preview/open
      setBaseRows((prev) =>
        prev.map((r) => {
          const u = byId.get(String(r.id));
          return u
            ? {
                ...r,
                openUrl: u.openUrl || r.openUrl || null,
                thumbUrl: u.thumbUrl || r.thumbUrl || null,
              }
            : r;
        })
      );

      setNoticeMsg(
        `✅ Saved profiles for ${res.updated.length} server asset(s). (Preview/Open now available)`,
        'success'
      );
    } catch (e) {
      setNoticeMsg(e?.message || 'Apply failed.', 'error');
    } finally {
      setCreating(false);
    }
  }, [baseRows.length, queueSource, selectionCount, selectedIds, gridRows, defaultProfile, setNoticeMsg]);

  /**
   * -----------------------------------------
   * Preview/Open helpers
   * -----------------------------------------
   */
  const closePreview = useCallback(() => {
    setPreviewOpen(false);
    setPreviewTitle('');
    setPreviewUrl('');
    setPreviewMime('');
    setPreviewBusy(false);

    if (previewObjectUrlRef.current) {
      try {
        URL.revokeObjectURL(previewObjectUrlRef.current);
      } catch {}
      previewObjectUrlRef.current = null;
    }
  }, []);

  const ensureServerUrlForRow = useCallback(
    async (row) => {
      if (row?.openUrl) return row.openUrl;

      const res = await applyServerAssetProfiles({
        items: [
          {
            cf_image_id: row.id,
            profile: row._profile,
            custom: row._custom,
          },
        ],
        defaultProfile,
      });

      if (!res?.ok || !Array.isArray(res.updated) || !res.updated[0]) {
        throw new Error(res?.message || 'Failed to generate delivery URL.');
      }

      const u = res.updated[0];

      setBaseRows((prev) =>
        prev.map((r) => {
          if (String(r.id) !== String(u.cf_image_id)) return r;
          return { ...r, openUrl: u.openUrl || null, thumbUrl: u.thumbUrl || null };
        })
      );

      return u.openUrl;
    },
    [defaultProfile]
  );

  const openPreviewForRow = useCallback(
    async (row) => {
      if (!row) return;

      setPreviewOpen(true);
      setPreviewBusy(true);
      setPreviewTitle(row.fileName || row.hier || row.id);
      setPreviewMime(String(row.mimeType || ''));

      try {
        if (previewObjectUrlRef.current) {
          try {
            URL.revokeObjectURL(previewObjectUrlRef.current);
          } catch {}
          previewObjectUrlRef.current = null;
        }

        if (queueSource === 'local') {
          const fileObj = filesRef.current.get(row.id);
          if (!fileObj) throw new Error('Missing local File object for preview.');

          const url = URL.createObjectURL(fileObj);
          previewObjectUrlRef.current = url;
          setPreviewUrl(url);
          setPreviewMime(fileObj.type || row.mimeType || 'image/*');
          return;
        }

        const url = await ensureServerUrlForRow(row);
        if (!url) throw new Error('No delivery URL returned.');
        setPreviewUrl(url);
      } catch (e) {
        setNoticeMsg(e?.message || 'Preview failed.', 'error');
        closePreview();
      } finally {
        setPreviewBusy(false);
      }
    },
    [queueSource, ensureServerUrlForRow, closePreview, setNoticeMsg]
  );

  const openRowInNewTab = useCallback(
    async (row) => {
      if (!row) return;
      try {
        if (queueSource === 'local') {
          const fileObj = filesRef.current.get(row.id);
          if (!fileObj) throw new Error('Missing local File object.');

          const url = URL.createObjectURL(fileObj);
          window.open(url, '_blank', 'noopener,noreferrer');

          setTimeout(() => {
            try {
              URL.revokeObjectURL(url);
            } catch {}
          }, 30_000);
          return;
        }

        const url = await ensureServerUrlForRow(row);
        if (!url) throw new Error('No delivery URL available.');
        window.open(url, '_blank', 'noopener,noreferrer');
      } catch (e) {
        setNoticeMsg(e?.message || 'Open failed.', 'error');
      }
    },
    [queueSource, ensureServerUrlForRow, setNoticeMsg]
  );

  /**
   * -----------------------------------------
   * Columns
   * -----------------------------------------
   */
  const columns = useMemo(
    () => [
      {
        field: '_actions',
        headerName: '',
        width: 96,
        sortable: false,
        filterable: false,
        disableColumnMenu: true,
        renderCell: (p) => (
          <Stack direction="row" spacing={0.5} alignItems="center">
            <Tooltip title="Preview">
              <span>
                <IconButton size="small" onClick={() => openPreviewForRow(p.row)}>
                  <VisibilityIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title="Open in new tab">
              <span>
                <IconButton size="small" onClick={() => openRowInNewTab(p.row)}>
                  <OpenInNewIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
          </Stack>
        ),
      },

      { field: 'hier', headerName: 'Hierarchy', width: 180, sortable: false },
      { field: 'fileName', headerName: 'File', width: 220, sortable: true },
      {
        field: 'sizeBytes',
        headerName: 'Size',
        width: 110,
        align: 'right',
        headerAlign: 'right',
        renderCell: (p) => (
          <span style={{ width: '100%', textAlign: 'right' }}>
            {formatBytes(Number(p.value ?? 0))}
          </span>
        ),
      },
      { field: 'extension', headerName: 'Type', width: 90, sortable: true },
      {
        field: 'resolutionCategory',
        headerName: 'Suggested',
        width: 120,
        sortable: true,
        renderCell: (p) => {
          const v = p.value;
          return (
            <Chip
              size="small"
              label={v === 'high' ? 'High' : v === 'web' ? 'Web' : 'Low'}
              color={v === 'high' ? 'error' : v === 'web' ? 'primary' : 'success'}
              variant="outlined"
            />
          );
        },
      },
      {
        field: 'profile',
        headerName: 'Profile',
        width: 180,
        sortable: false,
        renderCell: (p) => (
          <FormControl size="small" fullWidth>
            <Select
              value={p.row._profile}
              onChange={(e) => handleProfileChange(p.row.id, e.target.value)}
              variant="standard"
              disableUnderline
            >
              {IMAGE_PROFILES.map((x) => (
                <MenuItem key={x.id} value={x.id}>
                  {x.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        ),
      },
      {
        field: 'custom',
        headerName: 'Custom Configuration',
        minWidth: 420,
        flex: 1,
        sortable: false,
        renderCell: (p) => {
          const { id, _profile: prof, _custom: cust } = p.row;
          if (prof !== 'custom') return null;

          const onNum =
            (field) =>
            (e) =>
              handleCustomChange(
                id,
                field,
                e.target.value === '' ? null : Number(e.target.value)
              );

          const onFmt = (e) => handleCustomChange(id, 'format', e.target.value);

          return (
            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ width: '100%', py: 0.5 }}>
              <TextField
                size="small"
                type="number"
                label="W"
                sx={{ width: 80 }}
                value={cust.width ?? ''}
                onChange={onNum('width')}
                variant="standard"
              />
              <TextField
                size="small"
                type="number"
                label="H"
                sx={{ width: 80 }}
                value={cust.height ?? ''}
                onChange={onNum('height')}
                variant="standard"
              />
              <TextField
                size="small"
                type="number"
                label="Q"
                sx={{ width: 60 }}
                value={cust.quality ?? 75}
                onChange={onNum('quality')}
                variant="standard"
              />
              <FormControl size="small" sx={{ minWidth: 90 }}>
                <InputLabel variant="standard" shrink>
                  Format
                </InputLabel>
                <Select value={cust.format || 'auto'} onChange={onFmt} variant="standard" disableUnderline>
                  <MenuItem value="auto">auto</MenuItem>
                  <MenuItem value="avif">avif</MenuItem>
                  <MenuItem value="webp">webp</MenuItem>
                  <MenuItem value="jpeg">jpeg</MenuItem>
                </Select>
              </FormControl>
            </Stack>
          );
        },
      },
      {
        field: 'status',
        headerName: 'Status',
        width: 130,
        sortable: false,
        align: 'center',
        renderCell: () => (
          <Chip
            icon={<RadioButtonUncheckedIcon fontSize="small" />}
            label="Ready"
            size="small"
            variant="outlined"
            sx={{ borderColor: 'divider', color: 'text.secondary' }}
          />
        ),
      },
    ],
    [handleProfileChange, handleCustomChange, openPreviewForRow, openRowInNewTab]
  );

  /**
   * -----------------------------------------
   * Source UI actions
   * -----------------------------------------
   */
  const openSourceDialog = () => setSourceDialogOpen(true);
  const closeSourceDialog = () => setSourceDialogOpen(false);

  const chooseLocalSource = () => {
    closeSourceDialog();
    setLocalDialogOpen(true);
  };

  const chooseGoogleDriveSource = () => {
    closeSourceDialog();
    setDriveDialogOpen(true);
  };

  const openLocalFilesPicker = () => localFilesInputRef.current?.click();
  const openLocalFolderPicker = () => localFolderInputRef.current?.click();

  // Allow external triggers (context menu events) to open native pickers
  useEffect(() => {
    const handleFiles = () => openLocalFilesPicker();
    const handleFolder = () => openLocalFolderPicker();

    if (typeof window !== 'undefined') {
      window.addEventListener('cf:open-local-files-picker', handleFiles);
      window.addEventListener('cf:open-local-folder-picker', handleFolder);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('cf:open-local-files-picker', handleFiles);
        window.removeEventListener('cf:open-local-folder-picker', handleFolder);
      }
    };
  }, []);

  const onLocalFilesChosen = (e) => {
    const files = Array.from(e.target.files || []).filter(isLikelyImageFile);
    e.target.value = '';
    if (!files.length) return;
    processAndPrompt(files);
    setLocalDialogOpen(false);
  };

  const onLocalFolderChosen = (e) => {
    const files = Array.from(e.target.files || []).filter(isLikelyImageFile);
    e.target.value = '';
    if (!files.length) return;
    processAndPrompt(files);
    setLocalDialogOpen(false);
  };

  const closeDriveDialog = () => setDriveDialogOpen(false);

  const normalizeFolder = (p) =>
    String(p || '')
      .replace(/^\/+|\/+$/g, '')
      .replace(/\/{2,}/g, '/')
      .trim();

  const saveDriveUrl = async () => {
    const url = String(googleDriveUrl || '').trim();
    const targetFolder = normalizeFolder(targetCloudflareFolder);

    if (!url) {
      setNoticeMsg('Please paste a Google Drive URL.', 'warning');
      return;
    }

    if (!targetFolder) {
      setNoticeMsg(
        'Please open (double-click) a target folder in Cloudflare explorer first (not root).',
        'warning'
      );
      return;
    }

    setDriveDialogOpen(false);
    setNoticeMsg(`Importing from Google Drive this may take few minutes → /${targetFolder} ...`, 'info');

    try {
      const res = await fetch('/api/cloudflare/google-drive-public', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url,
          mode: 'gdown',
          action: 'import',
          targetFolder,
          cleanup: true,
          debug: false,
        }),
      }).then((r) => r.json());

      if (!res?.ok) throw new Error(res?.message || 'Import failed');

      setNoticeMsg(`✅ Imported ${res.uploaded?.length || 0} images from Drive into /${targetFolder}.`, 'success');
      setFsRefreshKey((k) => k + 1);
    } catch (e) {
      setNoticeMsg(e?.message || 'Import failed', 'error');
    }
  };

  /**
   * -----------------------------------------
   * Primary CTA (Upload vs Save Profiles)
   * -----------------------------------------
   */
  const handlePrimaryAction = useCallback(() => {
    if (queueSource === 'local') {
      requestUploadIntents('override');
      return;
    }
    applyProfilesToServerAssets();
  }, [queueSource, requestUploadIntents, applyProfilesToServerAssets]);

  const primaryLabel = useMemo(() => {
    if (creating) return queueSource === 'local' ? 'Uploading...' : 'Saving...';
    if (queueSource === 'local') {
      return selectionCount ? `Upload ${selectionCount} Selected` : 'Upload All to Cloudflare';
    }
    return selectionCount ? `Save ${selectionCount} Selected` : 'Save All Profiles';
  }, [creating, queueSource, selectionCount]);

  const isLargeLocalQueue = queueSource === 'local' && baseRows.length > SOFT_LIMIT_FILES;

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />

      <Container maxWidth="xl" sx={{ py: 3, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        {/* Hidden local pickers */}
        <input
          ref={localFilesInputRef}
          type="file"
          multiple
          accept="image/*"
          style={{ display: 'none' }}
          onChange={onLocalFilesChosen}
        />
        <input
          ref={localFolderInputRef}
          type="file"
          multiple
          accept="image/*"
          style={{ display: 'none' }}
          onChange={onLocalFolderChosen}
          webkitdirectory=""
          directory=""
        />

        {/* Header */}
        <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
          <CloudIcon fontSize="large" color="primary" />
          <Box>
            <Typography variant="h5" fontWeight={700} sx={{ lineHeight: 1.2 }}>
              Cloudflare Images
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Navigate to target folders and drop files to start.
            </Typography>
          </Box>

          <Box sx={{ flexGrow: 1 }} />

          {/* Theme toggle */}
          <Tooltip title={mode === 'dark' ? 'Switch to Light mode' : 'Switch to Dark mode'}>
            <IconButton onClick={toggleMode} size="small" sx={{ border: '1px solid', borderColor: 'divider' }}>
              {mode === 'dark' ? <Brightness7Icon fontSize="small" /> : <Brightness4Icon fontSize="small" />}
            </IconButton>
          </Tooltip>

          {/* Source button */}
          <Button variant="outlined" startIcon={<CloudIcon />} onClick={openSourceDialog} sx={{ textTransform: 'none' }}>
            Choose Source
          </Button>
        </Stack>

        <CloudflareFolderSelector
          onFolderSelect={setTargetCloudflareFolder}
          onFilesDrop={handleFilesDrop}
          onOpenLocalFilesPicker={openLocalFilesPicker}
          onOpenLocalFolderPicker={openLocalFolderPicker}
          pendingFiles={baseRows}
          pendingTarget={targetCloudflareFolder}
          refreshKey={fsRefreshKey}
        />

        {loading && baseRows.length === 0 && (
          <Box sx={{ mb: 2, display: 'flex', justifyContent: 'center', p: 2 }}>
            <CircularProgress size={40} thickness={4} />
          </Box>
        )}

        {preflightWarning && (
          <Alert severity={isLargeLocalQueue ? 'warning' : 'info'} sx={{ mt: 2 }}>
            {preflightWarning}
          </Alert>
        )}

        {notice && (
          <Alert severity={notice.severity || 'info'} sx={{ mt: 2 }}>
            {notice.text}
          </Alert>
        )}

        {baseRows.length > 0 && (
          <Paper variant="outlined" sx={{ mt: 3, p: 2 }}>
            <Stack spacing={2}>
              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                <Chip icon={<ImageIcon />} label={`${baseRows.length} images`} size="small" color="primary" />
                <Chip label={`Total: ${formatBytes(totalSizeBytes)}`} size="small" variant="outlined" />
                <Chip label={`High: ${resolutionStats.high}`} size="small" color="error" variant={resolutionStats.high ? 'filled' : 'outlined'} />
                <Chip label={`Web: ${resolutionStats.web}`} size="small" color="primary" variant={resolutionStats.web ? 'filled' : 'outlined'} />
                <Chip label={`Low: ${resolutionStats.low}`} size="small" color="success" variant={resolutionStats.low ? 'filled' : 'outlined'} />

                <Chip label={queueSource === 'local' ? 'Source: Local' : 'Source: Server'} size="small" variant="outlined" />

                {isLargeLocalQueue && (
                  <Chip label={`Large batch (> ${SOFT_LIMIT_FILES})`} size="small" color="warning" variant="outlined" />
                )}

                <Box sx={{ flexGrow: 1 }} />

                <Tooltip title="Clear all files">
                  <IconButton size="small" onClick={handleClearAll} color="error" sx={{ border: '1px solid', borderColor: 'error.main' }}>
                    <DeleteSweepIcon fontSize="small" />
                  </IconButton>
                </Tooltip>

                {typeof window !== 'undefined' && localStorage.getItem(STORAGE_PREF_KEY) && (
                  <Button size="small" onClick={clearPreference} sx={{ ml: 1, textTransform: 'none' }}>
                    Reset Preference
                  </Button>
                )}
              </Stack>

              <Divider />

              <Stack direction="row" spacing={2} alignItems="center" justifyContent="flex-end" flexWrap="wrap">
                <FormControl size="small" sx={{ minWidth: 220 }} disabled={selectionCount === 0}>
                  <InputLabel id="sel-prof">Set Selected To</InputLabel>
                  <Select
                    labelId="sel-prof"
                    label="Set Selected To"
                    value={bulkProfileValue}
                    onChange={(e) => handleBulkProfileChange(e.target.value)}
                    renderValue={(v) => {
                      if (selectionCount === 0) return 'Choose Profile...';
                      if (v === '__mixed__') return 'Mixed (selected)';
                      const found = IMAGE_PROFILES.find((x) => x.id === v);
                      return found?.label ?? 'Choose Profile...';
                    }}
                  >
                    <MenuItem value="" disabled>
                      Choose Profile...
                    </MenuItem>
                    <MenuItem value="__mixed__" disabled>
                      Mixed (selected)
                    </MenuItem>
                    {IMAGE_PROFILES.map((x) => (
                      <MenuItem key={x.id} value={x.id}>
                        {x.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl size="small" sx={{ minWidth: 200 }}>
                  <InputLabel id="def-prof">Default Profile</InputLabel>
                  <Select
                    labelId="def-prof"
                    label="Default Profile"
                    value={defaultProfile}
                    onChange={(e) => setDefaultProfile(e.target.value)}
                  >
                    {IMAGE_PROFILES.map((x) => (
                      <MenuItem key={x.id} value={x.id}>
                        {x.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                {/* ✅ Primary action = Upload (local) OR Save Profiles (server) */}
                <Button
                  variant="contained"
                  onClick={handlePrimaryAction}
                  disabled={creating || !baseRows.length}
                  size="large"
                  startIcon={<CloudUploadIcon />}
                  sx={{ textTransform: 'none' }}
                >
                  {primaryLabel}
                </Button>

                {creating && <CircularProgress size={24} sx={{ ml: 1 }} />}

                {queueSource === 'local' && intents?.ok && (
                  <Alert severity="success" sx={{ ml: 2 }}>
                    {`Created ${intents.count ?? intents.intents?.length ?? 0} direct upload URLs.`}
                  </Alert>
                )}
              </Stack>
            </Stack>
          </Paper>
        )}

        {(baseRows.length > 0 || loading) && (
          <Paper ref={gridPaperRef} variant="outlined" sx={{ mt: 3, height: 600, width: '100%' }}>
            <DataGrid
              key={baseRows.length > 0 ? 'data-grid-populated' : 'data-grid-empty'}
              rows={gridRows}
              columns={columns}
              checkboxSelection
              disableRowSelectionOnClick
              density="compact"
              rowHeight={72}
              columnBuffer={5}
              loading={loading}
              rowSelectionModel={rowSelectionModel}
              onRowSelectionModelChange={setRowSelectionModel}
              pagination
              paginationModel={paginationModel}
              onPaginationModelChange={setPaginationModel}
              pageSizeOptions={[20, 50, 100]}
              slots={{
                loadingOverlay: () => (
                  <Box
                    sx={{
                      display: 'flex',
                      height: '100%',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: 'background.paper',
                      opacity: 0.85,
                    }}
                  >
                    <CircularProgress size={50} />
                  </Box>
                ),
              }}
            />
          </Paper>
        )}

        <PreviewDialog
          open={previewOpen}
          previewTitle={previewTitle}
          previewBusy={previewBusy}
          previewUrl={previewUrl}
          previewMime={previewMime}
          closePreview={closePreview}
        />

        <MergeReplaceDialog
          open={confirmOpen}
          pendingItemsLength={pendingItems.length}
          baseRowsLength={baseRows.length}
          dontAskAgain={dontAskAgain}
          setDontAskAgain={setDontAskAgain}
          handleUserReplace={handleUserReplace}
          handleUserMerge={handleUserMerge}
          handleDialogClose={handleDialogClose}
        />

        <SourceChooserDialog
          open={sourceDialogOpen}
          onClose={closeSourceDialog}
          chooseLocalSource={chooseLocalSource}
          chooseGoogleDriveSource={chooseGoogleDriveSource}
        />

        <LocalPickerDialog
          open={localDialogOpen}
          onClose={() => setLocalDialogOpen(false)}
          openLocalFilesPicker={openLocalFilesPicker}
          openLocalFolderPicker={openLocalFolderPicker}
        />

        <GoogleDriveDialog
          open={driveDialogOpen}
          onClose={closeDriveDialog}
          targetCloudflareFolder={targetCloudflareFolder}
          googleDriveUrl={googleDriveUrl}
          setGoogleDriveUrl={setGoogleDriveUrl}
          saveDriveUrl={saveDriveUrl}
        />
      </Container>
    </ThemeProvider>
  );
}
