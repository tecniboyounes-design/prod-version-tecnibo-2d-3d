'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';
import DescriptorTable from '@/compatibilityV1/components/DescriptorTable';
import useDescriptorTree from '@/compatibilityV1/hooks/useDescriptorTree';
import DescriptorShell from '@/compatibilityV1/components/DescriptorShell';
import DescriptorsExplorer from '@/compatibilityV1/components/DescriptorsExplorer';
import LoadingCenter from '@/compatibilityV1/components/LoadingCenter';


export default function DescriptorClientPage() {
  const params = useParams();
  const name = decodeURIComponent(params.name || '');

  const [checking, setChecking] = useState(true);
  const [allowed, setAllowed] = useState(false);

  const [token, setToken] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [tokenError, setTokenError] = useState('');

  const [descriptors, setDescriptors] = useState([]);
  const [loadingDescriptors, setLoadingDescriptors] = useState(false);

  // 🔐 Token gate (reuse Cloudflare token dialog)
  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const res = await fetch('/api/cloudflare/access', { method: 'GET' });
        const data = await res.json();

        if (!mounted) return;
        const ok = Boolean(data?.ok);
        setAllowed(ok);
        setLoadingDescriptors(ok);
      } catch {
        if (!mounted) return;
        setAllowed(false);
      } finally {
        if (!mounted) return;
        setChecking(false);
      }
    })();

    return () => { mounted = false; };
  }, []);

  const submitToken = async () => {
    setSubmitting(true);
    setTokenError('');

    try {
      const res = await fetch('/api/cloudflare/access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      const data = await res.json();

      if (!res.ok || !data?.ok) {
        throw new Error(data?.message || 'Access denied.');
      }

      setAllowed(true);
      setLoadingDescriptors(true);
      setToken('');
    } catch (e) {
      setAllowed(false);
      setTokenError(e?.message || 'Access denied.');
    } finally {
      setSubmitting(false);
    }
  };

  // 📜 Fetch descriptors list ONCE
  useEffect(() => {
    let mounted = true;

    if (!allowed) {
      setDescriptors([]);
      setLoadingDescriptors(false);
      return () => { mounted = false; };
    }

    setLoadingDescriptors(true);

    (async () => {
      try {
        const res = await fetch('/api/descriptor/list', {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });
        if (!res.ok) throw new Error(`Failed to fetch descriptors: ${res.status}`);
        const data = await res.json();
        if (!mounted) return;
        setDescriptors(data.map((d) => ({ id: `d::${d.name}`, name: d.name })));
      } catch (err) {
        console.error('❌ Error fetching descriptors:', err);
        if (!mounted) return;
        setDescriptors([{ id: `d::${name}`, name }]);
      } finally {
        if (mounted) setLoadingDescriptors(false);
      }
    })();

    return () => { mounted = false; };
  }, [allowed, name]);

  // 🔄 Load selected descriptor tree once access is granted
  const { loading, error, descriptor, trees } = useDescriptorTree(name, {
    enabled: allowed,
  });

  

  // Full-page loader while checking token cookie
  if (checking) {
    return (
      <Box sx={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Stack spacing={2} alignItems="center">
          <CircularProgress />
          <Typography variant="body2" color="text.secondary">
            Checking access...
          </Typography>
        </Stack>
      </Box>
    );
  }

  let mainContent = null;
  if (allowed) {
    if (loadingDescriptors) {
      mainContent = (
        <LoadingCenter
          title="Loading descriptors…"
          subtitle="Preparing the list of available descriptors."
        />
      );
    } else if (loading) {
      mainContent = (
        <LoadingCenter
          title={`Loading “${name}” tree…`}
          subtitle="Fetching the descriptor tree data."
        />
      );
    } else if (error) {
      mainContent = (
        <Container sx={{ py: 3 }}>
          <Alert severity="error">Failed to load descriptor: {error}</Alert>
        </Container>
      );
    } else {
      mainContent = (
        <DescriptorShell
          descriptorName={descriptor || name}
          left={<DescriptorsExplorer descriptors={descriptors} defaultExpandRoot />}
        >
          <Container maxWidth="lg" sx={{ py: 3 }}>
            <DescriptorTable descriptor={descriptor} trees={trees} />
          </Container>
        </DescriptorShell>
      );
    }
  }

  /* ---------------- MAIN RENDER ---------------- */
  return (
    <Box>
      {/* Render the descriptor tool ONLY if authorized */}
      {mainContent}

      {/* Blocking dialog (cannot use the page without token) */}
      <Dialog open={!allowed} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <LockIcon fontSize="small" />
          Descriptor Access Required
        </DialogTitle>

        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Enter the access token to open the descriptor tool.
          </Typography>

          {tokenError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {tokenError}
            </Alert>
          )}

          <TextField
            autoFocus
            fullWidth
            label="Access token"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && token.trim() && !submitting) submitToken();
            }}
            placeholder="Paste token..."
          />

          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
            Hint: token is validated server-side (stored in .env) and saved as an HttpOnly cookie.
          </Typography>
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          <Button
            variant="contained"
            onClick={submitToken}
            disabled={!token.trim() || submitting}
            sx={{ textTransform: 'none' }}
          >
            {submitting ? 'Verifying...' : 'Unlock Descriptor'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
