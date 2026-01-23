// app/page.js
'use client';
import { useEffect, useState, useCallback } from 'react';
import OdooLoginButton from './loginButton';

export default function Home() {
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(false);

  const loadMe = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/me', { cache: 'no-store' });
      const j = await r.json();
      setMe(r.ok ? j : null);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadMe(); }, [loadMe]);

  return (
    <div style={{ display:'grid', gap:12 }}>
      <h3>Odoo OAuth login</h3>
      {!me && <OdooLoginButton />}
      {loading && <div>Loading…</div>}
      {me && <pre>{JSON.stringify(me, null, 2)}</pre>}
    </div>
  );
}
