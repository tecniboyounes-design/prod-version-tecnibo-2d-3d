'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@mui/material';
import { openCenteredPopup } from './popup';

const PROXY_PREFIX =
  process.env.NEXT_PUBLIC_ODOO_PROXY_PREFIX?.replace(/\/+$/, '') || '/api/odoo';
const ENV_DEBUG =
  (process.env.NEXT_PUBLIC_ODOO_SSO_DEBUG || '').toString().trim() === '1';

function makeLoginUrl(locale?: string, db?: string) {
  const loc = (locale || 'en_US').replace(/[^a-zA-Z_]/g, '');
  const qs = new URLSearchParams();
  if (db) qs.set('db', db);        // <<< critical
  qs.set('redirect', '/web');
  return `${PROXY_PREFIX}/${loc}/web/login?${qs.toString()}`;
}


function makeOAuthUrl(providerId) {
  const p = providerId ? `?provider=${encodeURIComponent(providerId)}` : '';
  return `${PROXY_PREFIX}/auth_oauth/signin${p}`;
}

export default function OdooPopupLogin({
  mode = 'login',
  providerId,
  onSuccess,
  locale = 'en_US',
  db,
  debug = ENV_DEBUG,
}) {
  const [busy, setBusy] = useState(false);
  const pollCountRef = useRef(0);
  const timer = useRef<number | null>(null);
  const popupRef = useRef<Window | null>(null);

  const log = (...args) => debug && console.log('[OdooPopupLogin]', ...args);

  const startPolling = useCallback(() => {
    const tick = async () => {
      pollCountRef.current += 1;
      const n = pollCountRef.current;

      try {
        log(`poll #${n}: GET /api/me`);
        const res = await fetch('/api/me?debug=1', { credentials: 'include', cache: 'no-store' });
        const ctype = res.headers.get('content-type') || '';
        log(`poll #${n}: status ${res.status} ${res.ok ? 'OK' : 'NOT OK'} | ctype=${ctype}`);

        if (res.ok) {
          const data = await res.json().catch(() => ({}));
          log(`poll #${n}: success payload`, data);
          onSuccess?.(data);
          if (popupRef.current && !popupRef.current.closed) {
            log('closing popup (authenticated)');
            popupRef.current.close();
          }
          if (timer.current) window.clearTimeout(timer.current);
          setBusy(false);
          return;
        } else {
          // For debugging, peek at short text body if not JSON
          const maybeText = await res.text().catch(() => '');
          if (!ctype.includes('application/json') && maybeText) {
            log(`poll #${n}: non-JSON body (first 300 chars):`, maybeText.slice(0, 300));
          } else if (ctype.includes('application/json')) {
            try {
              const j = JSON.parse(maybeText);
              log(`poll #${n}: JSON error`, j);
            } catch {
              log(`poll #${n}: JSON parse failed (first 300 chars):`, maybeText.slice(0, 300));
            }
          }
        }
      } catch (e) {
        log(`poll #${n}: fetch error`, e);
      }

      timer.current = window.setTimeout(tick, 1200);
    };

    tick();
  }, [onSuccess, debug]);

  const open = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    pollCountRef.current = 0;

    try {
      log('warming proxy', `${PROXY_PREFIX}/web`);
      await fetch(`${PROXY_PREFIX}/web`, { credentials: 'include', cache: 'no-store' });
    } catch (e) {
      log('warmup error (ignored)', e);
    }

    const href = mode === 'oauth' ? makeOAuthUrl(providerId) : makeLoginUrl(locale, db);
    log('opening popup:', href);
    popupRef.current = openCenteredPopup(href, 'Odoo Login');
    startPolling();

    const closeCheck = window.setInterval(() => {
      if (!popupRef.current || popupRef.current.closed) {
        window.clearInterval(closeCheck);
        log('popup closed by user or login page');
        setBusy(false);
      }
    }, 800);
  }, [busy, mode, providerId, locale, startPolling, debug]);

  useEffect(() => {
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, []);

  return (
    <Button variant="contained" onClick={open} disabled={busy}>
      {busy ? 'Waiting Odoo login…' : 'Sign in to Odoo'}
    </Button>
  );
}
