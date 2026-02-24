'use client';

import { useEffect, useState } from 'react';
import HomeClientPage from './HomeClientPage';

import { Box, CircularProgress } from '@mui/material';
import AccessTokenDialog from '@/components/AccessTokenDialog';

export default function Home() {
  const [status, setStatus] = useState('loading'); // 'loading' | 'ok' | 'unauth'
  const [me, setMe] = useState(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const r = await fetch('/api/me', { cache: 'no-store', credentials: 'include' });
        const j = await r.json().catch(() => null);
        if (cancelled) return;
        if (r.ok) {
          setMe(j);
          setStatus('ok');
        } else {
          setMe(null);
          setStatus('unauth');
        }
      } catch {
        if (cancelled) return;
        setMe(null);
        setStatus('unauth');
      }
    })();

    return () => { cancelled = true; };
  }, []);

  if (status === 'loading') {
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

  return (
    <Box sx={{ minHeight: '100svh', bgcolor: (t) => (t.palette.mode === 'dark' ? '#0b1220' : '#f7f8fb') }}>
      {status === 'ok' ? <HomeClientPage me={me} /> : null}

      <AccessTokenDialog
        open={status === 'unauth'}
        title="Back Office Access Required"
        description="Sign in with your Odoo account to access the Tecnibo Back Office."
        connectUrl="/api/odoo/login"
        connectLabel="Continue with Odoo Access"
      />
    </Box>
  );
}
