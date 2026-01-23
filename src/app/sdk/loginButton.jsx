// OdooLoginButton.tsx
'use client';
import { useState } from 'react';
import { Button } from '@mui/material';

export default function OdooLoginButton() {
  const [busy, setBusy] = useState(false);
  const go = async () => {
    setBusy(true);
    window.location.href = '/api/odoo/login';
  };
  return <Button onClick={go} disabled={busy}>{busy ? 'Redirecting…' : 'Sign in with Odoo'}</Button>;
}
