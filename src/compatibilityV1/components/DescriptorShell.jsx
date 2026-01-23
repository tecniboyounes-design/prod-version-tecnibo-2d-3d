'use client';

import * as React from 'react';
import { styled } from '@mui/material/styles';
import {
  Box, Drawer, Toolbar, IconButton, Typography, Tooltip,
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Alert, Chip
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import MiscellaneousServicesRoundedIcon from '@mui/icons-material/MiscellaneousServicesRounded';
import DeviceHubRoundedIcon from '@mui/icons-material/DeviceHubRounded';
import StorageRoundedIcon from '@mui/icons-material/StorageRounded';
import CategoryRoundedIcon from '@mui/icons-material/CategoryRounded';
import MenuOpenIcon from '@mui/icons-material/MenuOpen';
import PersonRoundedIcon from '@mui/icons-material/PersonRounded';
import WorkOutlineRoundedIcon from '@mui/icons-material/WorkOutlineRounded';
import BusinessRoundedIcon from '@mui/icons-material/BusinessRounded';
import VerifiedUserRoundedIcon from '@mui/icons-material/VerifiedUserRounded';
import DeleteForeverRoundedIcon from '@mui/icons-material/DeleteForeverRounded';
import LockRoundedIcon from '@mui/icons-material/LockRounded';
import { useSelector } from 'react-redux';
import { useRouter } from 'next/navigation';

const drawerWidth = 320;
const openedMixin = (theme) => ({ width: drawerWidth, transition: theme.transitions.create('width', { easing: theme.transitions.easing.sharp, duration: theme.transitions.duration.enteringScreen }) });
const closedMixin  = (theme) => ({ width: 0, overflowX: 'hidden', transition: theme.transitions.create('width', { easing: theme.transitions.easing.sharp, duration: theme.transitions.duration.leavingScreen }) });

const MiniDrawer = styled(Drawer, { shouldForwardProp: (prop) => prop !== 'open' })(({ theme, open }) => ({
  flexShrink: 0, whiteSpace: 'nowrap',
  ...(open ? openedMixin(theme) : closedMixin(theme)),
  '& .MuiDrawer-paper': open ? openedMixin(theme) : closedMixin(theme),
}));

const Main = styled('main')({ flexGrow: 1, overflow: 'auto', padding: 16 });

function useActiveDb() {
  const [db, setDb] = React.useState(() => {
    if (typeof window === 'undefined') return 'rp';
    return localStorage.getItem('compat.activeDb') || 'rp';
  });
  React.useEffect(() => {
    const sync = () => setDb(localStorage.getItem('compat.activeDb') || 'rp');
    const onCustom = () => sync();
    window.addEventListener('storage', sync);
    window.addEventListener('compat-db-change', onCustom);
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener('compat-db-change', onCustom);
    };
  }, []);
  return db;
}

function DescriptorToolbar({ open, onToggle, descriptorName, onRequestDelete }) {
  const userInfo = useSelector((s) => s.jsonData.user);
  const si = userInfo?.session_info ?? {};
  const name = si?.name || userInfo?.partner_display_name || si?.username || 'Guest';
  const jobTitle = userInfo?.job_position?.result?.[0]?.job_title || null;
  const role =
    si?.is_system && si?.is_admin ? 'System Admin'
    : si?.is_admin ? 'Admin'
    : si?.is_internal_user ? 'Internal'
    : si?.is_public ? 'Public'
    : 'User';
  const companiesObj = si?.user_companies?.allowed_companies || {};
  const companies = Object.values(companiesObj);
  const currentCompanyId = si?.user_companies?.current_company;
  const currentCompany = (currentCompanyId && companiesObj[currentCompanyId]?.name) || null;
  const companyCount = companies.length;

  // read-only banner in toolbar based on active DB
  const activeDb = useActiveDb();
  const isReadOnly = activeDb === 'imos';

  return (
    <Toolbar sx={{ gap: 1, minHeight: 48 }}>
      <IconButton onClick={onToggle} size="small" aria-label={open ? 'Close drawer' : 'Open drawer'} title={open ? 'Close drawer' : 'Open drawer'}>
        {open ? <MenuOpenIcon /> : <MenuIcon />}
      </IconButton>

      <CategoryRoundedIcon fontSize="small" sx={{ opacity: 0.8 }} />
      <Typography variant="subtitle2" sx={{ opacity: 0.75 }}>Imos Descriptor</Typography>

      {/* descriptor + delete */}
      <>
        <Typography variant="subtitle2" sx={{ opacity: 0.5, mx: 0.5 }}>•</Typography>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, maxWidth: 360 }} noWrap title={descriptorName || '(no descriptor)'}>
          {descriptorName || '(no descriptor)'}
        </Typography>
        <Tooltip title={isReadOnly ? 'Disabled in IMOS (read-only PROD)' : 'Delete descriptor'} disableInteractive>
          <span>
            <IconButton
              size="small"
              color="error"
              type="button"
              aria-label="Delete descriptor"
              onClick={(e) => { e.stopPropagation(); onRequestDelete?.(); }}
              sx={{ ml: 0.5, display: 'inline-flex', position: 'relative', zIndex: 1, pointerEvents: 'auto' }}
              disabled={!descriptorName || isReadOnly}
              tabIndex={0}
            >
              <DeleteForeverRoundedIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
        {isReadOnly && (
          <Chip
            size="small"
            color="warning"
            variant="outlined"
            icon={<LockRoundedIcon />}
            label="Read-only · PROD (IMOS)"
            sx={{ ml: 1 }}
          />
        )}
      </>

      {/* RIGHT group */}
      <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
        <VerifiedUserRoundedIcon fontSize="small" sx={{ opacity: 0.85 }} />
        <Typography variant="caption" sx={{ opacity: 0.85, display: { xs: 'none', sm: 'inline' }, whiteSpace: 'nowrap' }}>{role}</Typography>
        <Typography variant="subtitle2" sx={{ opacity: 0.5, mx: 0.25, display: { xs: 'none', sm: 'inline' } }}>•</Typography>
        <PersonRoundedIcon fontSize="small" sx={{ opacity: 0.85 }} />
        <Tooltip title={name} disableHoverListener={(name || '').length <= 18}>
          <Typography variant="caption" noWrap sx={{ fontWeight: 600, maxWidth: { xs: 100, sm: 160, md: 220 } }}>Hello, {name}</Typography>
        </Tooltip>
        {jobTitle && (
          <Box sx={{ display: { xs: 'none', sm: 'flex' }, alignItems: 'center', gap: 0.5, minWidth: 0 }}>
            <Typography variant="subtitle2" sx={{ opacity: 0.5, mx: 0.25 }}>•</Typography>
            <WorkOutlineRoundedIcon fontSize="small" sx={{ opacity: 0.85 }} />
            <Tooltip title={jobTitle} disableHoverListener={jobTitle.length <= 22}>
              <Typography variant="caption" noWrap sx={{ maxWidth: { sm: 160, md: 220 } }}>{jobTitle}</Typography>
            </Tooltip>
          </Box>
        )}
        {(currentCompany || companyCount > 0) && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minWidth: 0 }}>
            <Typography variant="subtitle2" sx={{ opacity: 0.5, mx: 0.25, display: { xs: 'none', sm: 'inline' } }}>•</Typography>
            <BusinessRoundedIcon fontSize="small" sx={{ opacity: 0.85 }} />
            <Typography variant="caption" sx={{ display: { xs: 'inline', md: 'none' }, opacity: 0.85 }}>
              {companyCount > 1 ? `${companyCount} co.` : '1 co.'}
            </Typography>
            {currentCompany && (
              <Tooltip title={companyCount > 1 ? `${currentCompany} • ${companyCount} companies` : currentCompany}>
                <Typography variant="caption" noWrap sx={{ display: { xs: 'none', md: 'inline' }, maxWidth: 240 }}>
                  {currentCompany}{companyCount > 1 ? ` · ${companyCount} companies` : ''}
                </Typography>
              </Tooltip>
            )}
          </Box>
        )}
      </Box>
    </Toolbar>
  );
}

/* ------------------------------ Shell wrapper ------------------------------ */

export default function DescriptorShell({
  left,
  children,
  descriptorName,
  descriptors,               // optional array of {name} or strings
}) {
  const [open, setOpen] = React.useState(true);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState(null);
  const router = useRouter();

  // helper: normalize to string list
  const namesFromProps = React.useMemo(() => {
    if (!descriptors) return null;
    if (Array.isArray(descriptors) && descriptors.length > 0) {
      if (typeof descriptors[0] === 'string') return descriptors;
      return descriptors.map((d) => d?.name).filter(Boolean);
    }
    return null;
  }, [descriptors]);

  const pickNextName = (list, current) => {
    const names = (list || []).map((s) => String(s).trim()).filter(Boolean);
    if (!names.length) return null;
    const idx = names.findIndex((n) => n.toUpperCase() === String(current || '').toUpperCase());
    if (idx === -1) return names[0];                 // current missing -> first
    if (idx + 1 < names.length) return names[idx + 1]; // normal case: next
    if (idx > 0) return names[idx - 1];              // last item deleted -> previous
    return null;                                      // only one item existed
  };

  const getNextAfterDelete = async (current) => {
    // prefer prop list; if absent, fetch fresh list
    if (namesFromProps && namesFromProps.length) {
      return pickNextName(namesFromProps, current);
    }
    try {
      const res = await fetch('/api/descriptor/list', { method: 'GET' });
      if (!res.ok) throw new Error(String(res.status));
      const data = await res.json();
      const serverNames = (data || []).map((d) => d?.name).filter(Boolean);
      return pickNextName(serverNames, current);
    } catch {
      return null;
    }
  };

  const doDelete = async () => {
    if (!descriptorName) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/descriptor/${encodeURIComponent(descriptorName)}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || `Delete failed (${res.status})`);

      // decide where to go next
      const nextName = await getNextAfterDelete(descriptorName);
      if (nextName) {
        router.push(`/descriptor/${encodeURIComponent(nextName)}`); // index + 1 (or previous if last)
      } else {
        // no descriptors left — send to a neutral place
        router.push('/descriptor'); // adjust if you have a listing page
      }
    } catch (e) {
      setError(e?.message ?? 'Unknown error');
      return; // keep dialog open to show error
    } finally {
      setBusy(false);
      setConfirmOpen(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', height: '100vh' }}>
      <MiniDrawer variant="permanent" open={open}>
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          <Toolbar sx={{ minHeight: 48, gap: 1.25, px: 1.5 }}>
            <MiscellaneousServicesRoundedIcon fontSize="small" sx={{ opacity: 0.85 }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>Compatibility</Typography>
            <Typography variant="subtitle2" sx={{ opacity: 0.6, mx: 0.5 }}>•</Typography>
            <DeviceHubRoundedIcon fontSize="small" sx={{ opacity: 0.8 }} />
            <Typography variant="caption" sx={{ opacity: 0.85, letterSpacing: 0.2 }}>RP</Typography>
            <Typography variant="subtitle2" sx={{ opacity: 0.6, mx: 0.5 }}>|</Typography>
            <StorageRoundedIcon fontSize="small" sx={{ opacity: 0.8 }} />
            <Typography variant="caption" sx={{ opacity: 0.85, letterSpacing: 0.2 }}>IMOS</Typography>
          </Toolbar>
          <Box sx={{ flex: 1, overflowY: 'auto', pr: 1 }}>{left}</Box>
        </Box>
      </MiniDrawer>

      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <DescriptorToolbar
          open={open}
          onToggle={() => setOpen((v) => !v)}
          descriptorName={descriptorName}
          onRequestDelete={() => setConfirmOpen(true)}
        />
        <Main>{children}</Main>
      </Box>

      <Dialog open={confirmOpen} onClose={() => !busy && setConfirmOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Delete descriptor</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2">
            Are you sure you want to permanently delete <b>{descriptorName}</b>? This will remove its rules and conditions.
          </Typography>
          {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)} disabled={busy}>Cancel</Button>
          <Button color="error" variant="contained" onClick={doDelete} disabled={busy}>
            {busy ? 'Deleting…' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
