'use client';

import { useEffect, useState } from 'react';
import HomeClientPage from './HomeClientPage';

import { Box, CircularProgress } from '@mui/material';
import AccessTokenDialog, { useAccessTokenGate } from '@/components/AccessTokenDialog';

export default function Home() {
  const {
    allowed,
    checking,
    token,
    setToken,
    submitting,
    error: tokenError,
    submitToken,
  } = useAccessTokenGate();

  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    if (!allowed) {
      setMe(null);
      setLoading(false);
      return () => { cancelled = true; };
    }

    setLoading(true);

    (async () => {
      try {
        const r = await fetch('/api/me', { cache: 'no-store' });
        const j = await r.json().catch(() => null);
        if (cancelled) return;
        setMe(r.ok ? j : null);
      } catch (e) {
        if (cancelled) return;
        setMe(null);
      } finally {
        if (cancelled) return;
        setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [allowed]);

  // Centered loader while checking token cookie
  if (checking) {
    return (
      <Box
        sx={{
          minHeight: '100svh',
          display: 'grid',
          placeItems: 'center',
          bgcolor: (t) => (t.palette.mode === 'dark' ? '#0b1220' : '#f7f8fb'),
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  // Loader while fetching /api/me after token is accepted
  if (allowed && loading) {
    return (
      <Box
        sx={{
          minHeight: '100svh',
          display: 'grid',
          placeItems: 'center',
          bgcolor: (t) => (t.palette.mode === 'dark' ? '#0b1220' : '#f7f8fb'),
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  // Authenticated → render your tiles page (even if /api/me returned null)
  return (
    <Box sx={{ minHeight: '100svh', bgcolor: (t) => (t.palette.mode === 'dark' ? '#0b1220' : '#f7f8fb') }}>
      {allowed ? <HomeClientPage me={me} /> : null}

      <AccessTokenDialog
        open={!allowed}
        title="Back Office Access Required"
        description="Enter the access token to open the Tecnibo Back Office."
        hint="Hint: token is validated server-side (stored in .env) and saved as an HttpOnly cookie."
        unlockLabel="Unlock Back Office"
        token={token}
        onTokenChange={setToken}
        onSubmit={submitToken}
        submitting={submitting}
        error={tokenError}
      />
    </Box>
  );
}
