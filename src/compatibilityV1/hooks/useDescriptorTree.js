import { useEffect, useState } from 'react';

// ✅ Add an optional second param with { enabled }
//    Backward compatible: existing calls still work (enabled defaults to true)
export default function useDescriptorTree(name, opts = {}) {
  const enabled = typeof opts === 'boolean' ? opts : (opts.enabled ?? true);

  const [state, setState] = useState({
    loading: !!enabled,     // when disabled, start non-loading
    error: null,
    descriptor: name,
    trees: [],
  });

  useEffect(() => {
    let cancelled = false;
   
    // 🚫 Not enabled? Don't fetch, ensure not loading.
    if (!enabled) {
      setState((s) => ({ ...s, loading: false, descriptor: name }));
      return;
    }

    // 🟢 Enabled: do your existing fetch logic
    setState({ loading: true, error: null, descriptor: name, trees: [] });

  (async () => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000); // 10s timeout

  try {
    // Point to RP service (override via NEXT_PUBLIC_COMPAT_BASE if needed)
  const base = process.env.NEXT_PUBLIC_COMPAT_BASE ?? '/api/descriptor';
  const url = `${base}/tree?name=${encodeURIComponent(name)}&db=rp`;
    const res = await fetch(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
     
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();

    if (!cancelled) {
      setState({
        loading: false,
        error: null,
        descriptor: name,
        trees: json?.trees ?? json ?? [],
      });
    }
  } catch (err) {
    if (!cancelled) {
      setState((s) => ({
        ...s,
        loading: false,
        error: err?.name === 'AbortError' ? 'Request timed out' : (err?.message || 'Failed to load descriptor'),
      }));
    }
  } finally {
    clearTimeout(timer);
  }
})();


    return () => { cancelled = true; };
  }, [name, enabled]);

  return state;
}
