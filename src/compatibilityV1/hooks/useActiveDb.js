// src/lib/useActiveDb.js
import { useEffect, useState } from 'react';

export function useActiveDb() {
  const [db, setDb] = useState(() => {
    if (typeof window === 'undefined') return 'rp';
    return localStorage.getItem('compat.activeDb') || 'rp';
  });

  useEffect(() => {
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
